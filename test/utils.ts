import 'reflect-metadata';

import type http from 'node:http';

import { Container } from '../src/container.ts';
import { RequestContext } from '../src/context/request-context.ts';
import { Config } from '../src/controllers/config/index.ts';
import { Logger } from '../src/controllers/logger/index.ts';
import { Dispatcher } from '../src/dispatcher.ts';
import { GlobalExceptionFilter } from '../src/filters/exception.filter.ts';
import { AuthGuard } from '../src/guards/auth.guard.ts';
import { LoggingInterceptor } from '../src/interceptors/logging.interceptor.ts';
import { Router } from '../src/router.ts';
import type { Ctor } from '../src/types/index.ts';

export const stubConfig = {
  port: 0,
  env: 'development',
  isProduction: false,
} as Config;

export const stubLogger = {
  info: () => {},
  error: () => {},
} as unknown as Logger;

export const createTestApp = (controllers: Ctor[]) => {
  const container = new Container();

  container.bind(Container).to(container);
  container.bind(Config).to(stubConfig);
  container.bind(Logger).to(stubLogger);
  container.bind(RequestContext).toSelf();
  container.bind(AuthGuard).toSelf();
  container.bind(LoggingInterceptor).toSelf();
  container.bind(GlobalExceptionFilter).toSelf();
  container.bind(Router).toSelf();
  container.bind(Dispatcher).toSelf();

  for (const controller of controllers) {
    container.bind(controller).toSelf();
  }

  const router = container.get(Router);
  controllers.forEach(controller => router.register(controller));

  const dispatcher = container.get(Dispatcher);
  dispatcher.registerMiddleware(RequestContext);

  return { container, router, dispatcher };
};

export const startTestServer = (dispatcher: Dispatcher) =>
  new Promise<{ baseUrl: string; close: () => Promise<void> }>(
    (resolve, reject) => {
      dispatcher.bootstrap();

      const server = dispatcher['httpServer'] as http.Server;

      server.once('error', reject);
      server.once('listening', () => {
        const address = server.address();

        if (!address || typeof address === 'string') {
          reject(new Error('Test server failed to bind to a port'));

          return;
        }

        resolve({
          baseUrl: `http://127.0.0.1:${address.port}`,
          close: () => new Promise(res => server.close(() => res())),
        });
      });
    },
  );
