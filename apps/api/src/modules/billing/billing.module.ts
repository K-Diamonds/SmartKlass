import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingFulfillmentService } from './billing-fulfillment.service';
import {
  BillingController,
  CheckoutController,
  StripeWebhookController,
} from './billing.controller';
import { BillingService } from './billing.service';
import { CheckoutService } from './checkout.service';
import { CreatorBillingService } from './creator-billing.service';
import { StripeClientService } from './stripe-client.service';
import { StripeWebhookService } from './stripe-webhook.service';

@Module({
  imports: [AuthModule],
  controllers: [CheckoutController, BillingController, StripeWebhookController],
  providers: [
    StripeClientService,
    CreatorBillingService,
    BillingFulfillmentService,
    CheckoutService,
    StripeWebhookService,
    BillingService,
  ],
  exports: [
    StripeClientService,
    CreatorBillingService,
    BillingFulfillmentService,
    CheckoutService,
    StripeWebhookService,
    BillingService,
  ],
})
export class BillingModule {}
