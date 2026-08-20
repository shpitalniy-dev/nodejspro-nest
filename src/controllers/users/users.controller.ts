import 'reflect-metadata';

import { Controller } from '../../decorators/controller.ts';
import { UseGuard } from '../../decorators/guard.ts';
import { HttpCode } from '../../decorators/http-code.ts';
import { Injectable } from '../../decorators/injectable.ts';
import { Get, Post } from '../../decorators/methods.ts';
import { Body, Param, Query } from '../../decorators/params.ts';
import { CreateUserDto } from '../../dto/create-user.dto.ts';
import { AuthGuard } from '../../guards/auth.guard.ts';

@Injectable()
@Controller('users')
export class Users {
  @Get()
  @UseGuard(AuthGuard)
  getAllUsers(@Query('limit') limit: string) {
    return {
      limit,
      users: Array.from({ length: Number(limit) }, (_, i) => ({ id: i + 1 })),
    };
  }

  @Get(':id')
  @UseGuard(AuthGuard)
  getUser(@Param('id') id: string) {
    return { id };
  }

  @Post()
  @HttpCode(201)
  @UseGuard(AuthGuard)
  createUser(@Body() user: CreateUserDto) {
    return user;
  }
}
