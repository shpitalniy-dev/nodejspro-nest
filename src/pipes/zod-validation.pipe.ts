import 'reflect-metadata';

import { z } from 'zod';

import { Injectable } from '../decorators/injectable.ts';
import { BadRequestException } from '../filters/exception.filter.ts';
import { PipeTransform } from '../types/index.ts';

@Injectable()
export class GlobalZodValidationPipe implements PipeTransform {
  transform<T = unknown>(
    schema: z.ZodType,
    value: unknown,
    property?: string,
  ): T {
    const result = schema.safeParse(value);

    if (!result.success) {
      const groupedErrors = result.error.issues.reduce(
        (acc, issue) => {
          const field = issue.path.join('.') || property || 'unknown';

          if (!acc[field]) {
            acc[field] = [];
          }

          acc[field].push(issue.message);

          return acc;
        },
        {} as Record<string, string[]>,
      );

      throw new BadRequestException(
        'Validation failed',
        Object.entries(groupedErrors).map(([field, messages]) => ({
          field,
          constraints: messages,
        })),
      );
    }

    return result.data as T;
  }
}
