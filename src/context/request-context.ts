import 'reflect-metadata';

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';

import { Injectable } from '../decorators/injectable.ts';
import { Middleware } from '../types/index.ts';

@Injectable()
export class RequestContext implements Middleware {
  private readonly als = new AsyncLocalStorage<{ requestId: string }>();

  get requestId(): string {
    return this.als.getStore()?.requestId ?? 'out-of-context';
  }

  async use(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => Promise<void>,
  ): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('x-request-id', requestId);
    await this.als.run({ requestId }, next);
  }
}
