import { IncomingMessage, ServerResponse } from 'node:http';

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

export type MethodParams = MethodParamItem[];
export type MethodGuards = Ctor<Guard>[];
export type MethodInterceptors = Ctor<Interceptor>[];

export interface ExecutionContext {
  req: IncomingMessage;
}
export interface Guard {
  canActivate(ctx: ExecutionContext): Promise<boolean>;
}

export interface Middleware {
  use(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => Promise<void>,
  ): Promise<void>;
}

export interface Interceptor {
  intercept(ctx: ExecutionContext, next: () => Promise<void>): Promise<void>;
}
