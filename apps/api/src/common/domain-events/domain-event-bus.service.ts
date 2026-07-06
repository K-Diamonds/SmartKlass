import { Injectable, Logger } from '@nestjs/common';
import type {
  DomainEvent,
  DomainEventHandler,
  DomainEventType,
} from './domain-event.types';

@Injectable()
export class DomainEventBusService {
  private readonly logger = new Logger(DomainEventBusService.name);
  private readonly handlers = new Map<DomainEventType, DomainEventHandler[]>();

  register(eventType: DomainEventType, handler: DomainEventHandler): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  async publish(event: DomainEvent & { id: string }): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    if (handlers.length === 0) {
      this.logger.debug(`No handlers for ${event.eventType}`);
      return;
    }

    for (const handler of handlers) {
      await handler(event);
    }
  }
}
