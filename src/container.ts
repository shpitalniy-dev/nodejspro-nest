import 'reflect-metadata';

import { getInjectMetadata } from './decorators/inject.ts';
import type { Ctor, InjectableOptions } from './types/index.ts';
import { INJECTABLE, INJECTABLE_OPTIONS } from './tokens.ts';

const getParamTypes = (target: Ctor): Ctor[] =>
  (Reflect.getMetadata('design:paramtypes', target) ?? []) as Ctor[];

const getInjectableOptions = (target: Ctor): InjectableOptions =>
  (Reflect.getMetadata(INJECTABLE_OPTIONS, target) ?? {}) as InjectableOptions;

const hasInjectableMetadata = (target: Ctor): boolean =>
  (Reflect.getOwnMetadata(INJECTABLE, target) ?? false) as boolean;

export class Container {
  private recipes = new Map<unknown, unknown>();
  private singletons = new Map<Ctor, unknown>();

  bind(token: unknown) {
    return {
      to: (value: unknown) => {
        this.recipes.set(token, value);
      },
      toSelf: () => {
        this.recipes.set(token, token);
      },
    };
  }

  get<T extends object>(target: Ctor<T>, path: string[] = []): T {
    if (!hasInjectableMetadata(target)) {
      throw new Error(`${target.name} misses @Injectable() decorator`);
    }

    if (!this.recipes.has(target)) {
      throw new Error(`No binding found for dependency: ${target.name}`);
    }

    const ownRecipe = this.recipes.get(target);

    if (ownRecipe !== target) {
      if (typeof ownRecipe === 'function') {
        return this.get(ownRecipe as Ctor, [...path, target.name]) as T;
      }

      return ownRecipe as T;
    }

    const options = getInjectableOptions(target);
    const { scope = 'singleton' } = options;
    const isSingleton = scope === 'singleton';

    if (isSingleton && this.singletons.has(target)) {
      return this.singletons.get(target) as T;
    }

    if (path.includes(target.name)) {
      throw new Error(
        `Circular dependency: ${[...path, target.name].join(' -> ')}`,
      );
    }

    const deps = getParamTypes(target);
    const injectMetadata = getInjectMetadata(target);
    const args = deps.map((dep, inx) => {
      const token = injectMetadata?.get(inx);
      const recipe = token ? this.recipes.get(token) : this.recipes.get(dep);

      if (typeof recipe === 'undefined') {
        throw new Error(
          `Recipe for dep at index ${inx} of ${target.name} is undefined`,
        );
      }

      if (typeof recipe === 'function') {
        return this.get(recipe as Ctor, [...path, target.name]);
      }

      return recipe;
    });

    const instance = new target(...args) as T;

    if (isSingleton) {
      this.singletons.set(target, instance);
    }

    return instance;
  }
}
