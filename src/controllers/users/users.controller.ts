import 'reflect-metadata';

import { Controller } from '../../decorators/controller.ts';
import { Injectable } from '../../decorators/injectable.ts';
import { Get } from '../../decorators/methods.ts';
import { Param, Query } from '../../decorators/params.ts';

@Injectable()
@Controller('users')
export class Users {
  @Get()
  getAllUsers(@Query('limit') limit: string) {
    return {
      limit,
      users: Array.from({ length: Number(limit) }, (_, i) => ({ id: i + 1 })),
    };
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return { id };
  }
}
