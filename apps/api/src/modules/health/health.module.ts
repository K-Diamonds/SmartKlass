import { Module } from '@nestjs/common';
import { OutboxModule } from '../../common/outbox/outbox.module';
import { ObservabilityModule } from '../../common/observability/observability.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [OutboxModule, ObservabilityModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
