import 'reflect-metadata';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Controller } from '../src/decorators/controller.ts';
import { UseGuards } from '../src/decorators/guard.ts';
import { Injectable } from '../src/decorators/injectable.ts';
import { Get } from '../src/decorators/methods.ts';
import { Param } from '../src/decorators/params.ts';
import { AuthGuard } from '../src/guards/auth.guard.ts';

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

    const { dispatcher } = createTestApp([UsersController, AuthGuard]);
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

    const { dispatcher } = createTestApp([UsersController, AuthGuard]);
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
});
