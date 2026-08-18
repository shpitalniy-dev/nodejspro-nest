import 'reflect-metadata';

import { INJECT } from '../tokens.ts';

export const getInjectMetadata = (target: object) =>
  Reflect.getMetadata(INJECT, target) as Map<number, unknown> | undefined;

export const getOwnInjectMetadata = (target: object) =>
  Reflect.getOwnMetadata(INJECT, target) as Map<number, unknown> | undefined;

export const Inject =
  (token: unknown): ParameterDecorator =>
  (target, _propertyKey, parameterIndex) => {
    const ownMap = getOwnInjectMetadata(target);
    const inheritedMap = getInjectMetadata(target);

    const injectMetadataMap = ownMap ?? new Map(inheritedMap ?? []);
    injectMetadataMap.set(parameterIndex, token);

    Reflect.defineMetadata(INJECT, injectMetadataMap, target);
  };
