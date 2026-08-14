import 'reflect-metadata';

import { INJECTABLE, INJECTABLE_OPTIONS } from '../tokens.ts';
import type { InjectableOptions } from '../types/index.ts';

export const Injectable =
  (options?: InjectableOptions): ClassDecorator =>
  target => {
    Reflect.defineMetadata(INJECTABLE, true, target);
    Reflect.defineMetadata(INJECTABLE_OPTIONS, options, target);
  };
