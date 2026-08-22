import 'reflect-metadata';

import { z } from 'zod';

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
  (nameOrSchema?: string | z.ZodType, name?: string): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    if (!propertyKey) {
      throw new Error(
        'Parameter decorators cannot be used on constructor parameters',
      );
    }

    const isSchema = nameOrSchema instanceof z.ZodType;
    const resolvedName = isSchema ? name : nameOrSchema;
    const schema = isSchema ? nameOrSchema : undefined;

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
      name: resolvedName,
      schema,
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
