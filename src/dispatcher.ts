/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import http from 'node:http';

import { Config } from './controllers/config/index.ts';
import { Logger } from './controllers/logger/index.ts';
import { getMethodGuards } from './decorators/guard.ts';
import { getMethodHttpCode } from './decorators/http-code.ts';
import { Inject } from './decorators/inject.ts';
import { Injectable } from './decorators/injectable.ts';
import { getMethodsParams } from './decorators/params.ts';
import {
  ForbiddenException,
  HttpError,
  NotFoundException,
} from './exceptions/http.exceptions.ts';
import { validateBody } from './pipes/validation.pipe.ts';
import { type HttpMethod, methodParamTypes } from './types/index.ts';
import { hasBody, parseBody } from './utils/http.ts';
import { Container } from './container.ts';
import { Router } from './router.ts';

const TRIVIAL_TYPES = new Set<unknown>([
  String,
  Number,
  Boolean,
  Array,
  Object,
]);

@Injectable()
export class Dispatcher {
  private httpServer: http.Server | null = null;

  constructor(
    @Inject(Config) private config: Config,
    @Inject(Logger) private logger: Logger,
    @Inject(Router) private router: Router,
    @Inject(Container) private container: Container,
  ) {}

  private handleError(res: http.ServerResponse, error: unknown) {
    this.logger.error(error);

    const isHttpError = error instanceof HttpError;
    const statusCode = isHttpError ? error.statusCode : 500;
    const message = this.config.isProduction
      ? 'Internal Server Error'
      : (error as Error).message;

    const hasErrors =
      isHttpError && Array.isArray(error.errors) && error.errors.length > 0;
    const contentType = hasErrors ? 'application/json' : 'text/plain';

    res.writeHead(statusCode, { 'Content-Type': contentType });
    res.end(hasErrors ? JSON.stringify(error.errors) : message);
  }

  private async parseRequestBody(
    req: http.IncomingMessage,
  ): Promise<Record<string, unknown> | undefined> {
    if (hasBody(req)) {
      try {
        return await parseBody(req);
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new HttpError(400, [{ message: 'Invalid JSON body' }]);
        }

        throw e;
      }
    }

    return undefined;
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    try {
      const { method, url = '' } = req;
      const route = this.router.match(url, method as HttpMethod);

      if (!route) {
        throw new NotFoundException();
      }

      const { controller, property, params } = route;
      const guards = getMethodGuards(controller, property) ?? [];

      if (guards.length) {
        for (const guard of guards) {
          const hasPassed = await this.container
            .get(guard)
            .canActivate({ req });

          if (!hasPassed) {
            throw new ForbiddenException();
          }
        }
      }

      const query = url.split('?')[1] ?? '';
      const queryParams = new URLSearchParams(query);
      const body = await this.parseRequestBody(req);

      const args: unknown[] = [];
      const methodParams = getMethodsParams(controller)?.get(property) ?? [];
      const httpCode = getMethodHttpCode(controller, property);

      for (const param of methodParams) {
        if (param.type === methodParamTypes.param) {
          args[param.index] = param.name ? params[param.name] : params;
        }

        if (param.type === methodParamTypes.query) {
          args[param.index] = param.name
            ? (queryParams.get(param.name) ?? undefined)
            : Object.fromEntries(queryParams);
        }

        if (param.type === methodParamTypes.body) {
          const value = param.name ? body?.[param.name] : body;
          const dtoClass =
            param.dtoClass && !TRIVIAL_TYPES.has(param.dtoClass)
              ? param.dtoClass
              : undefined;

          args[param.index] = dtoClass
            ? await validateBody(dtoClass, value)
            : value;
        }
      }

      const instance = this.container.get(route.controller);
      const result = await (instance as any)[route.property](...args);
      const json = JSON.stringify(result);

      res.writeHead(httpCode ?? 200, { 'Content-Type': 'application/json' });
      res.end(json);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  bootstrap() {
    const port = this.config.port;

    this.httpServer = http
      .createServer((req, res) => this.handleRequest(req, res))
      .listen(port, () =>
        this.logger.info(`Server is running on port: ${port}`),
      );
  }
}
