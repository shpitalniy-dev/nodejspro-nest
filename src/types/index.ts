import { IncomingMessage } from 'http';

import { Guard } from '../guards/guard.types.ts';

export type NodeEnv = 'development' | 'production';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ctor<T = object> = new (...args: any[]) => T;

export type Scope = 'singleton' | 'transient';

export interface InjectableOptions {
  scope?: Scope;
}

export const httpMethods = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  delete: 'DELETE',
} as const;

export type HttpMethod = (typeof httpMethods)[keyof typeof httpMethods];

export interface ControllerRouteItem {
  method: HttpMethod;
  property: string | symbol;
  path?: string;
}

export const methodParamTypes = {
  body: 'body',
  query: 'query',
  param: 'param',
} as const;

export type MethodParamType =
  (typeof methodParamTypes)[keyof typeof methodParamTypes];

export interface MethodParamItem {
  index: number;
  type: MethodParamType;
  name?: string;
  dtoClass?: Ctor;
}

export type MethodParamsMap = Map<string | symbol, MethodParamItem[]>;
export type MethodGuards = Ctor<Guard>[];

export interface ExecutionContext {
  req: IncomingMessage;
}
