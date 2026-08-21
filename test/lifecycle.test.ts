import 'reflect-metadata';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RequestContext } from '../src/context/request-context.ts';
import { Logger } from '../src/controllers/logger/index.ts';
import { Controller } from '../src/decorators/controller.ts';
import { UseGuards } from '../src/decorators/guard.ts';
import { Inject } from '../src/decorators/inject.ts';
import { Injectable } from '../src/decorators/injectable.ts';
import { UseInterceptors } from '../src/decorators/interceptor.ts';
import { Get } from '../src/decorators/methods.ts';
import { Param } from '../src/decorators/params.ts';
import { AuthGuard } from '../src/guards/auth.guard.ts';
import { LoggingInterceptor } from '../src/interceptors/logging.interceptor.ts';

import { createTestApp, startTestServer } from './utils.ts';

test.describe('Lifecycle', () => {
  test('non existent route responds with 404 Not Found', async () => {
    const { dispatcher } = createTestApp([]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/non-existent-route`);
      const text = await res.text();

      assert.equal(res.status, 404);
      assert.match(text, /Not Found/);
    } finally {
      await close();
    }
  });

  test('request with authorization header responds with 200 OK', async () => {
    @Injectable()
    @Controller('users')
    class UsersController {
      @Get(':id')
      @UseGuards(AuthGuard)
      one(@Param('id') id: string) {
        return { id };
      }
    }

    const { dispatcher } = createTestApp([UsersController]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/users/1`, {
        headers: {
          Authorization: 'Secret',
        },
      });
      const json = await res.json();

      assert.equal(res.status, 200);
      assert.deepEqual(json, { id: '1' });
    } finally {
      await close();
    }
  });

  test('request without authorization header responds with 403 Forbidden', async () => {
    @Injectable()
    @Controller('users')
    class UsersController {
      @Get(':id')
      @UseGuards(AuthGuard)
      one(@Param('id') id: string) {
        return { id };
      }
    }

    const { dispatcher } = createTestApp([UsersController]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/users/1`);
      const text = await res.text();

      assert.equal(res.status, 403);
      assert.match(text, /Forbidden/);
    } finally {
      await close();
    }
  });

  test('x-request-id has been added to the response', async () => {
    @Injectable()
    @Controller('users')
    class UsersController {
      @Get(':id')
      one(@Param('id') id: string) {
        return { id };
      }
    }

    const { dispatcher } = createTestApp([UsersController]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/users/1`);
      assert.ok(res.headers.get('x-request-id'));
    } finally {
      await close();
    }
  });

  test('client x-request-id has been resolved', async () => {
    @Injectable()
    @Controller('users')
    class UsersController {
      @Get(':id')
      one(@Param('id') id: string) {
        return { id };
      }
    }

    const { dispatcher } = createTestApp([UsersController]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const clientRequestId = 'test-request-id';
      const res = await fetch(`${baseUrl}/users/1`, {
        headers: {
          'x-request-id': clientRequestId,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('x-request-id'), clientRequestId);
    } finally {
      await close();
    }
  });

  test('multiple synchronous requests don`t override the x-request-id', async () => {
    @Injectable()
    @Controller('users')
    class UsersController {
      @Get(':id')
      one(@Param('id') id: string) {
        return { id };
      }

      @Get('/delay/:id')
      oneWithDelay(@Param('id') id: string) {
        return new Promise(resolve => {
          setTimeout(() => resolve({ id }), 1000);
        });
      }
    }

    const { dispatcher } = createTestApp([UsersController]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const firstRequestId = 'first-request-id';
      const secondRequestId = 'second-request-id';

      const firstRequestPromise = fetch(`${baseUrl}/users/delay/1`, {
        headers: {
          'x-request-id': firstRequestId,
        },
      });

      const secondRequestPromise = fetch(`${baseUrl}/users/2`, {
        headers: {
          'x-request-id': secondRequestId,
        },
      });

      const [firstResponse, secondResponse] = await Promise.all([
        firstRequestPromise,
        secondRequestPromise,
      ]);

      assert.equal(firstResponse.status, 200);
      assert.equal(firstResponse.headers.get('x-request-id'), firstRequestId);

      assert.equal(secondResponse.status, 200);
      assert.equal(secondResponse.headers.get('x-request-id'), secondRequestId);
    } finally {
      await close();
    }
  });

  test('request context is available inside the service', async () => {
    @Injectable()
    class UserService {
      constructor(
        @Inject(RequestContext) private requestContext: RequestContext,
      ) {}

      getUserById(id: string) {
        return { id, requestId: this.requestContext.requestId };
      }
    }

    @Injectable()
    @Controller('users')
    class UsersController {
      constructor(@Inject(UserService) private userService: UserService) {}

      @Get(':id')
      one(@Param('id') id: string) {
        return this.userService.getUserById(id);
      }
    }

    const { dispatcher } = createTestApp([UsersController, UserService]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const clientRequestId = 'test-request-id';
      const res = await fetch(`${baseUrl}/users/1`, {
        headers: {
          'x-request-id': clientRequestId,
        },
      });

      const body = (await res.json()) as { id: string; requestId: string };
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('x-request-id'), clientRequestId);
      assert.equal(body.requestId, clientRequestId);
    } finally {
      await close();
    }
  });

  test('logging interceptor measures time of requests with correct output', async () => {
    const logs: string[] = [];

    @Injectable()
    @Controller('users')
    class UsersController {
      @Get(':id')
      @UseInterceptors(LoggingInterceptor)
      one(@Param('id') id: string) {
        return { id };
      }
    }

    const { dispatcher, container } = createTestApp([UsersController]);
    container
      .bind(Logger)
      .to({ info: (msg: string) => logs.push(msg), error: () => {} });

    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/users/1`);
      assert.equal(res.status, 200);
      assert.match(logs[0], /\[.+\] GET \/users\/1 - [0-9]+(\.[0-9]+)? ?ms/);
    } finally {
      await close();
    }
  });
});
