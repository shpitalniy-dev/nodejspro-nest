import 'reflect-metadata';

import { METHOD_GUARDS } from '../tokens.ts';
import { Ctor, MethodGuard } from '../types/index.ts';

export const getMethodGuards = (target: Ctor, propertyKey: string | symbol) =>
  Reflect.getMetadata(METHOD_GUARDS, target, propertyKey) as
    | MethodGuard[]
    | undefined;

export const getOwnMethodGuards = (
  target: Ctor,
  propertyKey: string | symbol,
) =>
  Reflect.getOwnMetadata(METHOD_GUARDS, target, propertyKey) as
    | MethodGuard[]
    | undefined;

export const UseGuards =
  (...guards: MethodGuard[]): MethodDecorator =>
  (target, propertyKey, _descriptor) => {
    const ownGuards = getOwnMethodGuards(
      target.constructor as Ctor,
      propertyKey,
    );
    const inheritedGuards = getMethodGuards(
      target.constructor as Ctor,
      propertyKey,
    );

    const updated = [...(ownGuards ?? inheritedGuards ?? []), ...guards];

    Reflect.defineMetadata(
      METHOD_GUARDS,
      updated,
      target.constructor,
      propertyKey,
    );
  };
