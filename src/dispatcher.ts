/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import http from 'node:http';

import { Config } from './controllers/config/index.ts';
import { Logger } from './controllers/logger/index.ts';
import { getMethodGuards } from './decorators/guard.ts';
import { getMethodHttpCode } from './decorators/http-code.ts';
import { Inject } from './decorators/inject.ts';
import { Injectable } from './decorators/injectable.ts';
import { getMethodInterceptors } from './decorators/interceptor.ts';
import { getMethodsParams } from './decorators/params.ts';
import {
  ForbiddenException,
  HttpError,
  NotFoundException,
} from './exceptions/http.exceptions.ts';
import { validateBody } from './pipes/validation.pipe.ts';
import {
  Ctor,
  type HttpMethod,
  methodParamTypes,
  Middleware,
} from './types/index.ts';
import { hasBody, parseBody } from './utils/http.ts';
import { Container } from './container.ts';
import { MatchedRouteItem, Router } from './router.ts';

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
  private middlewares: Ctor<Middleware>[] = [];

  constructor(
    @Inject(Config) private config: Config,
    @Inject(Logger) private logger: Logger,
    @Inject(Router) private router: Router,
    @Inject(Container) private container: Container,
  ) {}

  registerMiddleware(middleware: Ctor<Middleware>) {
    this.middlewares.push(middleware);
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

  private async dispatch(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const chain = this.buildMiddlewareChain(req, res, () =>
        this.processRoute(req, res),
      );

      await chain();
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private buildMiddlewareChain(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: () => Promise<void>,
  ): () => Promise<void> {
    return this.middlewares.reduceRight<() => Promise<void>>(
      (next, middlewareCtor) => async () => {
        const middleware = this.container.get(middlewareCtor);
        await middleware.use(req, res, next);
      },
      next,
    );
  }

  private async processRoute(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    const { method, url = '' } = req;
    const route = this.router.match(url, method as HttpMethod);

    if (!route) {
      throw new NotFoundException();
    }

    await this.runGuards(route, req);

    const chain = this.buildInterceptorChain(route, req, () =>
      this.invokeHandler(route, req, res),
    );

    await chain();
  }

  private async runGuards(route: MatchedRouteItem, req: http.IncomingMessage) {
    const { controller, property } = route;
    const guards = getMethodGuards(controller, property) ?? [];

    for (const guard of guards) {
      const hasPassed = await this.container.get(guard).canActivate({ req });

      if (!hasPassed) {
        throw new ForbiddenException();
      }
    }
  }

  private buildInterceptorChain(
    route: MatchedRouteItem,
    req: http.IncomingMessage,
    next: () => Promise<void>,
  ): () => Promise<void> {
    const { controller, property } = route;
    const interceptors = getMethodInterceptors(controller, property) ?? [];

    return interceptors.reduceRight<() => Promise<void>>(
      (next, interceptorCtor) => async () => {
        const interceptor = this.container.get(interceptorCtor);
        await interceptor.intercept({ req }, next);
      },
      next,
    );
  }

  private async buildHandlerArgs(
    route: MatchedRouteItem,
    req: http.IncomingMessage,
  ): Promise<unknown[]> {
    const { controller, property, params } = route;
    const url = req.url ?? '';
    const query = url.split('?')[1] ?? '';
    const queryParams = new URLSearchParams(query);
    const body = await this.parseRequestBody(req);

    const args: unknown[] = [];
    const methodParams = getMethodsParams(controller, property) ?? [];

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

    return args;
  }

  private async invokeHandler(
    route: MatchedRouteItem,
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    const { controller, property } = route;
    const args = await this.buildHandlerArgs(route, req);

    const instance = this.container.get(controller);
    const result = await (instance as any)[property](...args);
    const json = JSON.stringify(result);

    const httpCode = getMethodHttpCode(controller, property);
    res.writeHead(httpCode ?? 200, { 'Content-Type': 'application/json' });
    res.end(json);
  }

  bootstrap() {
    const port = this.config.port;

    this.httpServer = http
      .createServer((req, res) => this.dispatch(req, res))
      .listen(port, () =>
        this.logger.info(`Server is running on port: ${port}`),
      );
  }
}
