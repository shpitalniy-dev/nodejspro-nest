import 'reflect-metadata';

import { Guard } from '../guards/guard.types.ts';
import { METHOD_GUARDS } from '../tokens.ts';
import { Ctor, MethodGuards } from '../types/index.ts';

export const getMethodGuards = (target: Ctor, propertyKey: string | symbol) =>
  Reflect.getMetadata(METHOD_GUARDS, target, propertyKey) as
    | MethodGuards
    | undefined;

export const getOwnMethodGuards = (
  target: Ctor,
  propertyKey: string | symbol,
) =>
  Reflect.getOwnMetadata(METHOD_GUARDS, target, propertyKey) as
    | MethodGuards
    | undefined;

export const UseGuard =
  (guard: Ctor<Guard>): MethodDecorator =>
  (target, propertyKey, _descriptor) => {
    const ownGuards = getOwnMethodGuards(
      target.constructor as Ctor,
      propertyKey,
    );
    const inheritedGuards = getMethodGuards(
      target.constructor as Ctor,
      propertyKey,
    );

    const guards = ownGuards ?? [...(inheritedGuards ?? [])];
    guards.push(guard);

    Reflect.defineMetadata(
      METHOD_GUARDS,
      guards,
      target.constructor,
      propertyKey,
    );
  };
