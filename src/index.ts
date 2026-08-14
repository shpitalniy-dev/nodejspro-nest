import 'reflect-metadata';

import express from 'express';

import { NODE_ENV, SERVER_PORT } from './config/index.ts';
import { Inject } from './decorators/inject.ts';
import { Injectable } from './decorators/injectable.ts';
import type { NodeEnv } from './types/index.ts';
import { Container } from './container.ts';
import { LOGGER_PREFIX } from './tokens.ts';

@Injectable()
class Config {
  readonly port: number = SERVER_PORT;
  readonly env: NodeEnv = NODE_ENV;
  readonly isProduction = NODE_ENV === 'production';
}

@Injectable()
class Logger {
  constructor(
    private config: Config,
    @Inject(LOGGER_PREFIX) private prefix: string,
  ) {}

  log(message: unknown) {
    console.log(`[${this.prefix}] [${this.config.env}]: `, message?.toString());
  }
}

@Injectable({ scope: 'transient' })
class User {
  constructor(
    private config: Config,
    private logger: Logger,
  ) {}

  getUser() {
    this.logger.log(`Getting user in ${this.config.env} mode`);

    return { id: 1, name: 'John Doe' };
  }
}

@Injectable()
class App {
  constructor(
    private config: Config,
    private logger: Logger,
  ) {}

  start() {
    const app = express();

    app.get('/health', async (_req, res) => {
      res.status(200).json({
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: 'OK',
      });
    });

    app.listen(this.config.port, () => {
      this.logger.log(`Server is running on port: ${this.config.port}`);
      this.logger.log(
        `Health check: http://localhost:${this.config.port}/health`,
      );
    });
  }
}

const container = new Container();

container.bind(Config).toSelf();
container.bind(Logger).toSelf();
container.bind(User).toSelf();
container.bind(App).toSelf();
container.bind(LOGGER_PREFIX).to('app');

const logger = container.get(Logger);
const app = container.get(App);

logger.log('Singleton: ' + (container.get(Logger) === container.get(Logger)));
logger.log('Transient: ' + (container.get(User) === container.get(User)));

app.start();

// @Note: circular dependency example
const A_TOKEN = Symbol('A_TOKEN');
const B_TOKEN = Symbol('B_TOKEN');

@Injectable()
class AService {
  constructor(@Inject(B_TOKEN) private b: unknown) {}
}

@Injectable()
class BService {
  constructor(@Inject(A_TOKEN) private a: unknown) {}
}

container.bind(AService).toSelf();
container.bind(BService).toSelf();
container.bind(A_TOKEN).to(AService);
container.bind(B_TOKEN).to(BService);

try {
  container.get(AService); // should throw here
} catch (error) {
  logger.log(`Error: ${(error as Error).message}`);
}
