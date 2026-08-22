import 'reflect-metadata';

import { RequestContext } from '../context/request-context.ts';
import { Inject } from '../decorators/inject.ts';
import { Injectable } from '../decorators/injectable.ts';

@Injectable()
export class UserService {
  constructor(@Inject(RequestContext) private requestContext: RequestContext) {}

  getUserById(id: string) {
    return { id, requestId: this.requestContext.requestId };
  }
}
