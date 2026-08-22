import 'reflect-metadata';

import { METHOD_INTERCEPTORS } from '../tokens.ts';
import { Ctor, MethodInterceptor } from '../types/index.ts';

export const getMethodInterceptors = (
  target: Ctor,
  propertyKey: string | symbol,
) =>
  Reflect.getMetadata(METHOD_INTERCEPTORS, target, propertyKey) as
    | MethodInterceptor[]
    | undefined;

const getOwnMethodInterceptors = (target: Ctor, propertyKey: string | symbol) =>
  Reflect.getOwnMetadata(METHOD_INTERCEPTORS, target, propertyKey) as
    | MethodInterceptor[]
    | undefined;

export const UseInterceptors =
  (...interceptors: MethodInterceptor[]): MethodDecorator =>
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
