/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import http from 'node:http';

import { Config } from './controllers/config/index.ts';
import { Logger } from './controllers/logger/index.ts';
import { Inject } from './decorators/inject.ts';
import { Injectable } from './decorators/injectable.ts';
import { getMethodParamsMap } from './decorators/params.ts';
import { HttpError } from './exceptions/http.exceptions.ts';
import { validateBody } from './pipes/validation.pipe.ts';
import { type HttpMethod, methodParamTypes } from './types/index.ts';
import { hasBody, parseBody } from './utils/http.ts';
import { Container } from './container.ts';
import { Router } from './router.ts';

@Injectable()
export class Dispatcher {
  private httpServer: http.Server | null = null;

  constructor(
    @Inject(Config) private config: Config,
    @Inject(Logger) private logger: Logger,
    @Inject(Router) private router: Router,
    @Inject(Container) private container: Container,
  ) {}

  private notFound(res: http.ServerResponse) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

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

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    const { method, url = '' } = req;
    const route = this.router.match(url, method as HttpMethod);

    if (!route) {
      this.notFound(res);

      return;
    }

    try {
      const query = url.split('?')[1] ?? '';
      const queryParams = new URLSearchParams(query);
      const body = hasBody(req) ? await parseBody(req) : undefined;

      const args: unknown[] = [];
      const methodParams = getMethodParamsMap(route.controller, route.property);

      for (const param of methodParams ?? []) {
        if (param.type === methodParamTypes.param) {
          args[param.index] = param.name
            ? route.params[param.name]
            : route.params;
        }

        if (param.type === methodParamTypes.query) {
          args[param.index] = param.name
            ? (queryParams.get(param.name) ?? undefined)
            : Object.fromEntries(queryParams);
        }

        if (param.type === methodParamTypes.body) {
          const value = param.name ? body?.[param.name] : body;
          args[param.index] = param.dtoClass
            ? await validateBody(param.dtoClass, value)
            : value;
        }
      }

      const instance = this.container.get(route.controller);
      const result = await (instance as any)[route.property](...args);
      const json = JSON.stringify(result);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(json);
    } catch (httpError) {
      this.handleError(res, httpError);
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
