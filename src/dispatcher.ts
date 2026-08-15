/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import http from 'node:http';

import { Config } from './controllers/config/index.ts';
import { Logger } from './controllers/logger/index.ts';
import { Inject } from './decorators/inject.ts';
import { Injectable } from './decorators/injectable.ts';
import type { HttpMethod } from './types/index.ts';
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

  private handleError(res: http.ServerResponse, error: Error) {
    this.logger.error(error);
    const message = this.config.isProduction
      ? 'Internal Server Error'
      : error.message;

    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(message);
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
      const instance = this.container.get(route.controller);
      const result = await (instance as any)[route.property]();
      const json = JSON.stringify(result);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(json);
    } catch (error) {
      this.handleError(res, error as Error);
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
