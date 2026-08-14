import 'reflect-metadata';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Container } from '../src/container.ts';
import { Inject } from '../src/decorators/inject.ts';
import { Injectable } from '../src/decorators/injectable.ts';

test('Singleton returns true', () => {
  @Injectable()
  class Singleton {}

  const container = new Container();
  container.bind(Singleton).toSelf();

  const a = container.get(Singleton);
  const b = container.get(Singleton);

  assert.equal(a, b);
});

test('Transient returns false', () => {
  @Injectable({ scope: 'transient' })
  class Transient {}

  const container = new Container();
  container.bind(Transient).toSelf();

  const a = container.get(Transient);
  const b = container.get(Transient);

  assert.notEqual(a, b);
});

test('@Inject(token) works', () => {
  const CONFIG = Symbol.for('CONFIG');
  const container = new Container();

  @Injectable()
  class SomeService {
    constructor(@Inject(CONFIG) public config: { url: string }) {}
  }

  container.bind(CONFIG).to({ url: 'postgres://localhost/demo' });
  container.bind(SomeService).toSelf();

  const someService = container.get(SomeService);

  assert.equal(someService.config.url, 'postgres://localhost/demo');
});

test('Circular dependency throws error', () => {
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

  const container = new Container();
  container.bind(AService).toSelf();
  container.bind(BService).toSelf();
  container.bind(A_TOKEN).to(AService);
  container.bind(B_TOKEN).to(BService);

  assert.throws(() => {
    container.get(AService);
  }, /Circular dependency/);
});
