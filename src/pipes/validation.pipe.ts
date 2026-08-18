import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { HttpError } from '../exceptions/http.exceptions.ts';

export async function validateBody<T extends object>(
  dtoClass: new () => T,
  plain: unknown,
): Promise<T> {
  const instance = plainToInstance(dtoClass, plain);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    throw new HttpError(
      400,
      errors.map(e => ({
        field: e.property,
        constraints: e.constraints,
      })),
    );
  }

  return instance;
}
