import 'reflect-metadata';

import http from 'node:http';

import { Injectable } from '../decorators/injectable.ts';
import { Guard } from '../types/index.ts';

@Injectable()
export class AuthGuard implements Guard {
  async canActivate(ctx: { req: http.IncomingMessage }): Promise<boolean> {
    return !!ctx.req.headers['authorization'];
  }
}
