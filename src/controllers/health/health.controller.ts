import 'reflect-metadata';

import { Controller } from '../../decorators/controller.ts';
import { Injectable } from '../../decorators/injectable.ts';
import { Get } from '../../decorators/methods.ts';

@Injectable()
@Controller('health')
export class Health {
  @Get()
  health() {
    return {
      uptime: process.uptime(),
      timestamp: Date.now(),
      status: 'OK',
    };
  }
}
