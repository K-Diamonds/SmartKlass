import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DomainEventsModule } from '../domain-events/domain-events.module';
import { EmailModule } from '../email/email.module';
import { OutboxHandlersService } from './outbox-handlers.service';
import { OutboxIdempotencyService } from './outbox-idempotency.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { OutboxService } from './outbox.service';

@Module({
  imports: [DomainEventsModule, EmailModule, AnalyticsModule],
  providers: [
    OutboxService,
    OutboxProcessorService,
    OutboxHandlersService,
    OutboxIdempotencyService,
  ],
  exports: [OutboxService, OutboxProcessorService],
})
export class OutboxModule {}
