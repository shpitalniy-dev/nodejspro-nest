import 'reflect-metadata';

import { METHOD_HTTP_CODE } from '../tokens.ts';

export const getMethodHttpCode = (
  target: object,
  propertyKey: string | symbol,
): number | undefined =>
  Reflect.getMetadata(METHOD_HTTP_CODE, target, propertyKey);

export const HttpCode =
  (code: number): MethodDecorator =>
  (target, propertyKey, _descriptor) => {
    Reflect.defineMetadata(
      METHOD_HTTP_CODE,
      code,
      target.constructor,
      propertyKey,
    );
  };
