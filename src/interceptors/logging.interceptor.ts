import 'reflect-metadata';

import { RequestContext } from '../context/request-context.ts';
import { Logger } from '../controllers/logger/index.ts';
import { Inject } from '../decorators/inject.ts';
import { Injectable } from '../decorators/injectable.ts';
import { ExecutionContext, Interceptor } from '../types/index.ts';

@Injectable()
export class LoggingInterceptor implements Interceptor {
  constructor(
    @Inject(Logger) private logger: Logger,
    @Inject(RequestContext) private requestContext: RequestContext,
  ) {}

  async intercept(
    ctx: ExecutionContext,
    next: () => Promise<void>,
  ): Promise<void> {
    const start = performance.now();

    await next();

    const duration = performance.now() - start;
    const requestId = this.requestContext.requestId;
    const { method, url } = ctx.req;
    const path = url?.split('?')[0] ?? '';

    this.logger.info(
      `[${requestId}] ${method} ${path} - ${duration.toFixed(1)}ms`,
    );
  }
}
