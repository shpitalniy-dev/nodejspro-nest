import 'reflect-metadata';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Container } from '../src/container.ts';
import { Inject } from '../src/decorators/inject.ts';
import { Injectable } from '../src/decorators/injectable.ts';

test.describe('Container', () => {
  test('Graph of dependencies is built correctly', () => {
    @Injectable()
    class A {}

    @Injectable()
    class B {
      constructor(private a: A) {}
    }

    @Injectable()
    class C {
      constructor(private b: B) {}
    }

    const container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();

    const c = container.get(C);

    assert.ok(c instanceof C);
    assert.ok(c['b'] instanceof B);
    assert.ok(c['b']['a'] instanceof A);
  });

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

  test('subclass without its own @Injectable is rejected, even if the parent is injectable', () => {
    @Injectable()
    class Base {}

    class Child extends Base {}

    const container = new Container();
    container.bind(Base).toSelf();
    container.bind(Child).toSelf();

    assert.throws(() => {
      container.get(Child);
    }, /misses @Injectable/);
  });

  test('@Inject on a subclass does not corrupt the parent dependency map', () => {
    const TOKEN_A = Symbol('TOKEN_A');
    const TOKEN_B = Symbol('TOKEN_B');

    @Injectable()
    class Base {
      constructor(@Inject(TOKEN_A) public v: string) {}
    }

    @Injectable()
    class Child extends Base {
      constructor(@Inject(TOKEN_B) v: string) {
        super(v);
      }
    }

    const container = new Container();
    container.bind(TOKEN_A).to('one');
    container.bind(TOKEN_B).to('two');
    container.bind(Base).toSelf();
    container.bind(Child).toSelf();

    const base = container.get(Base);
    const child = container.get(Child);

    assert.equal(base.v, 'one');
    assert.equal(child.v, 'two');
  });
});
