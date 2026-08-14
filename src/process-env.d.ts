import type { NodeEnv } from './types/index.ts';

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: NodeEnv;
  }
}
