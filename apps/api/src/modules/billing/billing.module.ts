import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OutboxModule } from '../../common/outbox/outbox.module';
import { BillingFulfillmentService } from './billing-fulfillment.service';
import {
  BillingController,
  CheckoutController,
  StripeWebhookController,
} from './billing.controller';
import { BillingService } from './billing.service';
import { CheckoutService } from './checkout.service';
import { CreatorBillingService } from './creator-billing.service';
import { CreatorPayoutPolicyService } from './creator-payout-policy.service';
import { MarketplaceAccountingService } from './marketplace-accounting.service';
import { StripeClientService } from './stripe-client.service';
import { StripeWebhookService } from './stripe-webhook.service';

@Module({
  imports: [AuthModule, OutboxModule],
  controllers: [CheckoutController, BillingController, StripeWebhookController],
  providers: [
    StripeClientService,
    CreatorPayoutPolicyService,
    CreatorBillingService,
    MarketplaceAccountingService,
    BillingFulfillmentService,
    CheckoutService,
    StripeWebhookService,
    BillingService,
  ],
  exports: [
    StripeClientService,
    CreatorPayoutPolicyService,
    CreatorBillingService,
    MarketplaceAccountingService,
    BillingFulfillmentService,
    CheckoutService,
    StripeWebhookService,
    BillingService,
  ],
})
export class BillingModule {}
