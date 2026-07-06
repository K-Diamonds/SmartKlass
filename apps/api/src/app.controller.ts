import { Controller, Get } from '@nestjs/common';
import { Public } from './common/auth';

@Public()
@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      name: 'SmartKlass API',
      version: '1',
      health: '/api/v1/health/live',
      api: '/api/v1',
    };
  }
}
