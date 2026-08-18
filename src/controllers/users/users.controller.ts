import 'reflect-metadata';

import { Controller } from '../../decorators/controller.ts';
import { Injectable } from '../../decorators/injectable.ts';
import { Get, Post } from '../../decorators/methods.ts';
import { Body, Param, Query } from '../../decorators/params.ts';
import { CreateUserDto } from '../../dto/create-user.dto.ts';

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

  @Post()
  createUser(@Body() user: CreateUserDto) {
    return user;
  }
}
