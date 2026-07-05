import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/auth';
import { HealthCheckDto } from './dto/health-check.dto';
import { HealthService } from './health.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): Promise<HealthCheckDto> {
    return this.healthService.check();
  }
}
