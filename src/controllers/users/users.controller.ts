import 'reflect-metadata';

import { Controller } from '../../decorators/controller.ts';
import { UseGuards } from '../../decorators/guard.ts';
import { HttpCode } from '../../decorators/http-code.ts';
import { Inject } from '../../decorators/inject.ts';
import { Injectable } from '../../decorators/injectable.ts';
import { UseInterceptors } from '../../decorators/interceptor.ts';
import { Get, Post } from '../../decorators/methods.ts';
import { Body, Param, Query } from '../../decorators/params.ts';
import { AuthGuard } from '../../guards/auth.guard.ts';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor.ts';
import { UserService } from '../../services/user.service.ts';

import type { CreateUserInput } from './users.schemas.ts';
import {
  CreateUserSchema,
  IdParamSchema,
  LimitQuerySchema,
} from './users.schemas.ts';

@Injectable()
@Controller('users')
export class Users {
  constructor(@Inject(UserService) private userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard)
  getAllUsers(@Query(LimitQuerySchema, 'limit') limit: number) {
    return {
      limit,
      users: Array.from({ length: Number(limit) }, (_, i) => ({ id: i + 1 })),
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(LoggingInterceptor)
  getUser(@Param(IdParamSchema, 'id') id: string) {
    return this.userService.getUserById(id);
  }

  @Post()
  @HttpCode(201)
  @UseGuards(AuthGuard)
  createUser(@Body(CreateUserSchema) user: CreateUserInput) {
    return user;
  }
}
