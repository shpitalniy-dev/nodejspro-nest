import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { BadRequestException } from '../filters/exception.filter.ts';

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
    throw new BadRequestException(
      'Validation failed',
      errors.map(e => ({
        field: e.property,
        constraints: e.constraints,
      })),
    );
  }

  return instance;
}
