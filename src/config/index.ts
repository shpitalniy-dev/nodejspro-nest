import type { NodeEnv } from '../types/index.ts';

const env = process.env.NODE_ENV || 'development';

export const SERVER_PORT = parseInt(process.env.PORT || '3000', 10);
export const IS_PRODUCTION = env === 'production';
export const NODE_ENV = env as NodeEnv;
