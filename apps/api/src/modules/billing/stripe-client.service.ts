import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeClientService {
  private readonly stripe: Stripe | null;

  constructor(private readonly configService: ConfigService) {
    // Real Stripe integration requires STRIPE_SECRET_KEY from your Stripe Dashboard.
    // Test keys: https://dashboard.stripe.com/test/apikeys
    const secretKey = this.configService.get<string>('stripe.secretKey');

    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  getClient(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.',
      );
    }

    return this.stripe;
  }

  getWebhookSecret(): string {
    // Webhook signature verification requires STRIPE_WEBHOOK_SECRET.
    // Local dev: run `stripe listen --forward-to localhost:4000/api/v1/stripe/webhook`
    const webhookSecret = this.configService.get<string>(
      'stripe.webhookSecret',
    );

    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'Stripe webhooks are not configured. Set STRIPE_WEBHOOK_SECRET in your environment.',
      );
    }

    return webhookSecret;
  }

  isConfigured(): boolean {
    return Boolean(this.stripe);
  }
}
