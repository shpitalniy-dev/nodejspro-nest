import 'reflect-metadata';

import { METHOD_PARAMS } from '../tokens.ts';
import type { Ctor, MethodParamsMap, MethodParamType } from '../types/index.ts';

export const getControllerMethodsParams = (target: Ctor) =>
  Reflect.getMetadata(METHOD_PARAMS, target) as MethodParamsMap | undefined;

export const getOwnControllerMethodsParams = (target: Ctor) =>
  Reflect.getOwnMetadata(METHOD_PARAMS, target) as MethodParamsMap | undefined;

export const getMethodParamsMap = (
  target: Ctor,
  propertyKey: string | symbol,
) => (getControllerMethodsParams(target) ?? new Map()).get(propertyKey) ?? [];

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

    const ownParams = getOwnControllerMethodsParams(target.constructor as Ctor);
    const inheritedParams = getControllerMethodsParams(
      target.constructor as Ctor,
    );

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
