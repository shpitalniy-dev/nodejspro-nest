import 'reflect-metadata';

import { METHOD_PARAMS } from '../tokens.ts';
import type {
  Ctor,
  MethodParamItem,
  MethodParamsMap,
  MethodParamType,
} from '../types/index.ts';

export const getControllerMethodsParams = (target: Ctor): MethodParamsMap =>
  (Reflect.getMetadata(METHOD_PARAMS, target) ?? new Map()) as MethodParamsMap;

export const getMethodParamsMap = (
  target: Ctor,
  method: string | symbol,
): MethodParamItem[] =>
  getControllerMethodsParams(target).get(method as string) ?? [];

const paramDecoratorFactory =
  (type: MethodParamType) =>
  (name?: string): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    const existingParams = getControllerMethodsParams(
      target.constructor as Ctor,
    );
    const paramsForProperty = existingParams.get(propertyKey as string) || [];
    paramsForProperty.push({
      index: parameterIndex,
      type,
      name,
    });
    existingParams.set(propertyKey as string, paramsForProperty);

    Reflect.defineMetadata(METHOD_PARAMS, existingParams, target.constructor);
  };

export const Param = paramDecoratorFactory('param');
export const Query = paramDecoratorFactory('query');
export const Body = paramDecoratorFactory('body');
