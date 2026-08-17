import 'reflect-metadata';

import { IsEmail, IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  readonly name!: string;

  @IsEmail()
  readonly email!: string;

  @IsInt()
  @Min(18)
  @Max(100)
  readonly age!: number;
}
