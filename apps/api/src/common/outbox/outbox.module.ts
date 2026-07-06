import { Module } from '@nestjs/common';
import { DomainEventsModule } from '../domain-events/domain-events.module';
import { OutboxHandlersService } from './outbox-handlers.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { OutboxService } from './outbox.service';

@Module({
  imports: [DomainEventsModule],
  providers: [OutboxService, OutboxProcessorService, OutboxHandlersService],
  exports: [OutboxService, OutboxProcessorService],
})
export class OutboxModule {}
