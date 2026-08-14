export type NodeEnv = 'development' | 'production';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ctor<T = unknown> = new (...args: any[]) => T;

export type Scope = 'singleton' | 'transient';

export interface InjectableOptions {
  scope?: Scope;
}
