import 'reflect-metadata';

import { INJECT } from '../tokens.ts';

export const getInjectMetadata = (target: object): Map<number, unknown> =>
  (Reflect.getMetadata(INJECT, target) ?? new Map()) as Map<number, unknown>;

export const Inject =
  (token: unknown): ParameterDecorator =>
  (target, _propertyKey, parameterIndex) => {
    const injectMetadataMap = getInjectMetadata(target);
    injectMetadataMap.set(parameterIndex, token);
    Reflect.defineMetadata(INJECT, injectMetadataMap, target);
  };
