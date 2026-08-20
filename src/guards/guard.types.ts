import type { ExecutionContext } from '../types/index.ts';

export interface Guard {
  canActivate(ctx: ExecutionContext): Promise<boolean>;
}
