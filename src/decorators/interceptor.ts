import 'reflect-metadata';

import { METHOD_INTERCEPTORS } from '../tokens.ts';
import { Ctor, MethodInterceptors } from '../types/index.ts';

export const getMethodInterceptors = (
  target: Ctor,
  propertyKey: string | symbol,
) =>
  Reflect.getMetadata(METHOD_INTERCEPTORS, target, propertyKey) as
    | MethodInterceptors
    | undefined;

const getOwnMethodInterceptors = (target: Ctor, propertyKey: string | symbol) =>
  Reflect.getOwnMetadata(METHOD_INTERCEPTORS, target, propertyKey) as
    | MethodInterceptors
    | undefined;

export const UseInterceptors =
  (...interceptors: MethodInterceptors): MethodDecorator =>
  (target, propertyKey, _descriptor) => {
    const ownInterceptors = getOwnMethodInterceptors(
      target.constructor as Ctor,
      propertyKey,
    );
    const inheritedInterceptors = getMethodInterceptors(
      target.constructor as Ctor,
      propertyKey,
    );

    const updated = [
      ...(ownInterceptors ?? inheritedInterceptors ?? []),
      ...interceptors,
    ];

    Reflect.defineMetadata(
      METHOD_INTERCEPTORS,
      updated,
      target.constructor,
      propertyKey,
    );
  };
