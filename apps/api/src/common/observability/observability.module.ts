import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { TracingService } from './tracing.service';

@Global()
@Module({
  providers: [MetricsService, TracingService],
  exports: [MetricsService, TracingService],
})
export class ObservabilityModule {}
