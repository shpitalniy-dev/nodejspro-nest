import 'reflect-metadata';

import { Inject } from '../../decorators/inject.ts';
import { Injectable } from '../../decorators/injectable.ts';
import { LOGGER_PREFIX } from '../../tokens.ts';
import { Config } from '../config/index.ts';

@Injectable()
export class Logger {
  constructor(
    @Inject(Config) private config: Config,
    @Inject(LOGGER_PREFIX) private prefix: string,
  ) {}

  private formatMessage(message: unknown): string {
    return `[${this.prefix}] [${this.config.env}]: ${message?.toString()}`;
  }

  info(message: unknown) {
    console.log(this.formatMessage(message));
  }

  error(message: unknown) {
    console.error(this.formatMessage(message));
  }
}
