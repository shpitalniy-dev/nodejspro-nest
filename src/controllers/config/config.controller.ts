import 'reflect-metadata';

import { Injectable } from '../../decorators/injectable.ts';
import type { NodeEnv } from '../../types/index.ts';

@Injectable()
export class Config {
  readonly port: number = parseInt(process.env.PORT || '3000', 10);
  readonly env: NodeEnv = (process.env.NODE_ENV || 'development') as NodeEnv;

  get isProduction(): boolean {
    return this.env === 'production';
  }
}
