export type NodeEnv = 'development' | 'production';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ctor<T = unknown> = new (...args: any[]) => T;

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
  path: string | undefined;
  property: string | symbol;
}
