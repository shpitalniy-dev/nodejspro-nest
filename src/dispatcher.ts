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
  GlobalExceptionFilter,
  HttpException,
  NotFoundException,
} from './filters/exception.filter.ts';
import { GlobalZodValidationPipe } from './pipes/zod-validation.pipe.ts';
import {
  Ctor,
  type HttpMethod,
  methodParamTypes,
  Middleware,
} from './types/index.ts';
import { hasBody, parseBody } from './utils/http.ts';
import { Container } from './container.ts';
import { MatchedRouteItem, Router } from './router.ts';

@Injectable()
export class Dispatcher {
  private httpServer: http.Server | null = null;
  private middlewares: Ctor<Middleware>[] = [];

  constructor(
    @Inject(Config) private config: Config,
    @Inject(Logger) private logger: Logger,
    @Inject(Router) private router: Router,
    @Inject(Container) private container: Container,
    @Inject(GlobalZodValidationPipe)
    private validationPipe: GlobalZodValidationPipe,
    @Inject(GlobalExceptionFilter)
    private exceptionFilter: GlobalExceptionFilter,
  ) {}

  registerMiddleware(middleware: Ctor<Middleware>) {
    this.middlewares.push(middleware);
  }

  private async parseRequestBody(
    req: http.IncomingMessage,
  ): Promise<Record<string, unknown> | undefined> {
    if (hasBody(req)) {
      try {
        return await parseBody(req);
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new HttpException(400, 'Invalid JSON body');
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
      this.exceptionFilter.catch(error, { req, res });
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

    await this.runGuards(route, req, res);

    const chain = this.buildInterceptorChain(route, req, res, () =>
      this.invokeHandler(route, req, res),
    );

    await chain();
  }

  private async runGuards(
    route: MatchedRouteItem,
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    const { controller, property } = route;
    const guards = getMethodGuards(controller, property) ?? [];

    for (const guard of guards) {
      const hasPassed = await this.container
        .get(guard)
        .canActivate({ req, res });

      if (!hasPassed) {
        throw new ForbiddenException();
      }
    }
  }

  private buildInterceptorChain(
    route: MatchedRouteItem,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: () => Promise<void>,
  ): () => Promise<void> {
    const { controller, property } = route;
    const interceptors = getMethodInterceptors(controller, property) ?? [];

    return interceptors.reduceRight<() => Promise<void>>(
      (next, interceptorCtor) => async () => {
        const interceptor = this.container.get(interceptorCtor);
        await interceptor.intercept({ req, res }, next);
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
      let value: unknown;

      if (param.type === methodParamTypes.param) {
        value = param.name ? params[param.name] : params;
      } else if (param.type === methodParamTypes.query) {
        value = param.name
          ? (queryParams.get(param.name) ?? undefined)
          : Object.fromEntries(queryParams);
      } else if (param.type === methodParamTypes.body) {
        value = param.name ? body?.[param.name] : body;
      }

      const schema = param.schema ? param.schema : undefined;
      args[param.index] = schema
        ? await this.validationPipe.transform(schema, value, param.name)
        : value;
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
