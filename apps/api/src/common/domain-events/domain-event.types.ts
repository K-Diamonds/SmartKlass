export const DOMAIN_EVENTS = {
  PAYMENT_COMPLETED: 'PaymentCompleted',
  COURSE_ACCESS_GRANTED: 'CourseAccessGranted',
  CREATOR_TRANSACTION_CREATED: 'CreatorTransactionCreated',
  SUBSCRIPTION_RENEWED: 'SubscriptionRenewed',
  SUBSCRIPTION_EXPIRED: 'SubscriptionExpired',
  SUBSCRIPTION_REVOKED: 'SubscriptionRevoked',
  NOTIFICATION_SENT: 'NotificationSent',
  EMAIL_QUEUED: 'EmailQueued',
  ANALYTICS_UPDATED: 'AnalyticsUpdated',
  REFUND_PROCESSED: 'RefundProcessed',
  DISPUTE_OPENED: 'DisputeOpened',
} as const;

export type DomainEventType =
  (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

export type DomainEventPayload = Record<string, unknown>;

export type DomainEvent = {
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: DomainEventPayload;
  correlationId?: string;
};

export type DomainEventHandler = (
  event: DomainEvent & { id: string },
) => Promise<void>;
