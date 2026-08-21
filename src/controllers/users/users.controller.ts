import 'reflect-metadata';

import { Controller } from '../../decorators/controller.ts';
import { UseGuards } from '../../decorators/guard.ts';
import { HttpCode } from '../../decorators/http-code.ts';
import { Inject } from '../../decorators/inject.ts';
import { Injectable } from '../../decorators/injectable.ts';
import { UseInterceptors } from '../../decorators/interceptor.ts';
import { Get, Post } from '../../decorators/methods.ts';
import { Body, Param, Query } from '../../decorators/params.ts';
import { CreateUserDto } from '../../dto/create-user.dto.ts';
import { AuthGuard } from '../../guards/auth.guard.ts';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor.ts';
import { UserService } from '../../services/user.service.ts';

@Injectable()
@Controller('users')
export class Users {
  constructor(@Inject(UserService) private userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard)
  getAllUsers(@Query('limit') limit: string) {
    return {
      limit,
      users: Array.from({ length: Number(limit) }, (_, i) => ({ id: i + 1 })),
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(LoggingInterceptor)
  getUser(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Post()
  @HttpCode(201)
  @UseGuards(AuthGuard)
  createUser(@Body() user: CreateUserDto) {
    return user;
  }
}
