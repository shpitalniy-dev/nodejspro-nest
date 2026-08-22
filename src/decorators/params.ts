import 'reflect-metadata';

import { METHOD_PARAMS } from '../tokens.ts';
import type { Ctor, MethodParam, MethodParamType } from '../types/index.ts';

export const getMethodsParams = (target: Ctor, propertyKey: string | symbol) =>
  Reflect.getMetadata(METHOD_PARAMS, target, propertyKey) as
    | MethodParam[]
    | undefined;

export const getOwnMethodsParams = (
  target: Ctor,
  propertyKey: string | symbol,
) =>
  Reflect.getOwnMetadata(METHOD_PARAMS, target, propertyKey) as
    | MethodParam[]
    | undefined;

const paramDecoratorFactory =
  (type: MethodParamType) =>
  (name?: string): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    if (!propertyKey) {
      throw new Error(
        'Parameter decorators cannot be used on constructor parameters',
      );
    }

    const paramTypes = Reflect.getMetadata(
      'design:paramtypes',
      target,
      propertyKey,
    ) as Ctor[] | undefined;

    const ownParams = getOwnMethodsParams(
      target.constructor as Ctor,
      propertyKey,
    );
    const inheritedParams = getMethodsParams(
      target.constructor as Ctor,
      propertyKey,
    );

    const params = ownParams ?? [...(inheritedParams ?? [])];
    params.push({
      index: parameterIndex,
      type,
      name,
      dtoClass: paramTypes?.[parameterIndex],
    });

    Reflect.defineMetadata(
      METHOD_PARAMS,
      params,
      target.constructor,
      propertyKey,
    );
  };

export const Param = paramDecoratorFactory('param');
export const Query = paramDecoratorFactory('query');
export const Body = paramDecoratorFactory('body');
