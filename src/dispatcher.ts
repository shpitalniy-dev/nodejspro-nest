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
    res.statusCode = 404;
    res.end('Not Found');
  }

  private error(res: http.ServerResponse, message: string) {
    res.statusCode = 500;
    res.end(message || 'Internal Server Error');
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const { method, url = '' } = req;
    const route = this.router.match(url, method as HttpMethod);

    if (route) {
      try {
        const instance = this.container.get(route.controller);
        const result = (instance as any)[route.property]();

        const json = JSON.stringify(result);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(json);
      } catch (error) {
        this.logger.error(error);
        this.error(res, (error as Error).message);
      }
    } else {
      this.notFound(res);
    }
  }

  bootstrap() {
    const port = this.config.port;

    this.httpServer = http
      .createServer((req, res) => this.handleRequest(req, res))
      .listen(port, () =>
        this.logger.log(`Server is running on port: ${port}`),
      );
  }
}
