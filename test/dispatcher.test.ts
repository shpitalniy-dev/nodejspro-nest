import 'reflect-metadata';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Container } from '../src/container.ts';
import { Config } from '../src/controllers/config/index.ts';
import { Logger } from '../src/controllers/logger/index.ts';
import { Controller } from '../src/decorators/controller.ts';
import { HttpCode } from '../src/decorators/http-code.ts';
import { Inject } from '../src/decorators/inject.ts';
import { Injectable } from '../src/decorators/injectable.ts';
import { Get, getControllerRoutes, Post } from '../src/decorators/methods.ts';
import {
  Body,
  getMethodParamsMap,
  Param,
  Query,
} from '../src/decorators/params.ts';
import { Dispatcher } from '../src/dispatcher.ts';
import { CreateUserDto } from '../src/dto/create-user.dto.ts';
import { Router } from '../src/router.ts';

import {
  createTestApp,
  startTestServer,
  stubConfig,
  stubLogger,
} from './utils.ts';

test.describe('Dispatcher', () => {
  test('route resolves through controller prefix and @Param', async () => {
    @Injectable()
    @Controller('users')
    class UsersController {
      @Get(':id')
      getUser(@Param('id') id: string) {
        return { id };
      }
    }

    const { dispatcher } = createTestApp([UsersController]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/users/42`);
      const body = (await res.json()) as { id: string };

      assert.equal(res.status, 200);
      assert.equal(body.id, '42');
    } finally {
      await close();
    }
  });

  test('@Query value is delivered to the handler as its own argument', async () => {
    @Injectable()
    @Controller('users')
    class UsersController {
      @Get()
      list(@Query('limit') limit: string) {
        return { limit };
      }
    }

    const { dispatcher } = createTestApp([UsersController]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/users?limit=5`);
      const body = (await res.json()) as { limit: string };

      assert.equal(res.status, 200);
      assert.equal(body.limit, '5');
    } finally {
      await close();
    }
  });

  test('invalid JSON body is rejected with 400', async () => {
    @Injectable()
    @Controller('users')
    class UsersController {
      @Post()
      createUser(@Body() user: CreateUserDto) {
        return user;
      }
    }

    const { dispatcher } = createTestApp([UsersController]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"email": "',
      });

      const text = await res.text();

      assert.equal(res.status, 400);
      assert.match(text, /Invalid JSON body/);
    } finally {
      await close();
    }
  });

  test('invalid DTO body is rejected with 400 and field details', async () => {
    @Injectable()
    @Controller('users')
    class UsersController {
      @Post()
      createUser(@Body() user: CreateUserDto) {
        return user;
      }
    }

    const { dispatcher } = createTestApp([UsersController]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      });

      const text = await res.text();

      assert.equal(res.status, 400);
      assert.match(text, /email/);
      assert.match(text, /field/);
      assert.match(text, /constraints/);
    } finally {
      await close();
    }
  });

  test('valid DTO body reaches the handler as a real DTO instance with correct response status', async () => {
    const received: unknown[] = [];

    @Injectable()
    @Controller('users')
    class UsersController {
      @Post()
      @HttpCode(201)
      createUser(@Body() user: CreateUserDto) {
        received.push(user);

        return user;
      }
    }

    const { dispatcher } = createTestApp([UsersController]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
        }),
      });

      assert.equal(res.status, 201);
      assert.equal(received.length, 1);
      assert.ok(received[0] instanceof CreateUserDto);
    } finally {
      await close();
    }
  });

  test('controller resolves its service from the same container singleton', async () => {
    @Injectable()
    class UsersService {
      findAll() {
        return [] as unknown[];
      }
    }

    @Injectable()
    @Controller('users')
    class UsersController {
      constructor(
        @Inject(UsersService) public readonly usersService: UsersService,
      ) {}

      @Get()
      list() {
        return this.usersService.findAll();
      }
    }

    const container = new Container();

    container.bind(Container).to(container);
    container.bind(Config).to(stubConfig);
    container.bind(Logger).to(stubLogger);
    container.bind(Router).toSelf();
    container.bind(Dispatcher).toSelf();
    container.bind(UsersService).toSelf();
    container.bind(UsersController).toSelf();

    const router = container.get(Router);
    router.register(UsersController);

    const dispatcher = container.get(Dispatcher);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      await fetch(`${baseUrl}/users`);

      const controllerInstance = container.get(UsersController);
      const directService = container.get(UsersService);

      assert.equal(controllerInstance.usersService, directService);
    } finally {
      await close();
    }
  });

  test('@Get on a subclass does not corrupt the parent controller routes', () => {
    @Controller('base')
    class Base {
      @Get('list')
      list() {
        return [];
      }
    }

    class Child extends Base {
      @Get('detail')
      detail() {
        return {};
      }
    }

    const baseRoutes = getControllerRoutes(Base);
    const childRoutes = getControllerRoutes(Child);

    assert.equal(baseRoutes?.length, 1);
    assert.equal(childRoutes?.length, 2);
  });

  test('@Param on an overriding subclass method does not corrupt the parent method params', () => {
    @Controller('base')
    class Base {
      @Get(':id')
      getOne(@Param('id') id: string) {
        return { id };
      }
    }

    class Child extends Base {
      @Get(':id')
      getOne(@Param('id') id: string, @Query('verbose') verbose?: string) {
        return { id, verbose };
      }
    }

    const baseParams = getMethodParamsMap(Base, 'getOne');
    const childParams = getMethodParamsMap(Child, 'getOne');

    assert.equal(baseParams.length, 1);
    assert.equal(baseParams[0].name, 'id');
    assert.notEqual(baseParams, childParams);
    assert.ok(childParams.length >= 2);
  });
});
