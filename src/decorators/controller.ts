import 'reflect-metadata';

import { CONTROLLER_PREFIX } from '../tokens.ts';

export const getControllerPrefix = (target: object): string =>
  (Reflect.getMetadata(CONTROLLER_PREFIX, target) ?? '') as string;

export const Controller =
  (prefix?: string): ClassDecorator =>
  target => {
    Reflect.defineMetadata(CONTROLLER_PREFIX, prefix ?? '', target);
  };
