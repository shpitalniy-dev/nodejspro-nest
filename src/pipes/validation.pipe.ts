import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { Injectable } from '../decorators/injectable.ts';
import { BadRequestException } from '../filters/exception.filter.ts';
import { Ctor, PipeTransform } from '../types/index.ts';

@Injectable()
export class GlobalValidationPipe implements PipeTransform {
  async transform(dtoClass: Ctor<object>, value: unknown): Promise<unknown> {
    const instance = plainToInstance(dtoClass, value);
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
}
