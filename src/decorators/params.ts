import 'reflect-metadata';

import { METHOD_PARAMS } from '../tokens.ts';
import type { Ctor, MethodParamsMap, MethodParamType } from '../types/index.ts';

export const getMethodsParams = (target: Ctor) =>
  Reflect.getMetadata(METHOD_PARAMS, target) as MethodParamsMap | undefined;

export const getOwnMethodsParams = (target: Ctor) =>
  Reflect.getOwnMetadata(METHOD_PARAMS, target) as MethodParamsMap | undefined;

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

    const ownParams = getOwnMethodsParams(target.constructor as Ctor);
    const inheritedParams = getMethodsParams(target.constructor as Ctor);

    const params = ownParams ?? new Map(inheritedParams ?? []);
    const paramsForProperty = [...(params.get(propertyKey as string) || [])];
    paramsForProperty.push({
      index: parameterIndex,
      type,
      name,
      dtoClass: paramTypes?.[parameterIndex],
    });
    params.set(propertyKey as string, paramsForProperty);

    Reflect.defineMetadata(METHOD_PARAMS, params, target.constructor);
  };

export const Param = paramDecoratorFactory('param');
export const Query = paramDecoratorFactory('query');
export const Body = paramDecoratorFactory('body');
