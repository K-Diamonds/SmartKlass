export const PLATFORM_FEE_PERCENT = 20 as const;

/** Minimum platform fee per subscriber charge (USD cents). */
export const PLATFORM_FEE_MIN_CENTS = 500;

/** Minimum price creators can charge subscribers (USD cents). At this price, creator earnings are $0. */
export const SUBSCRIBER_PRICE_MIN_CENTS = PLATFORM_FEE_MIN_CENTS;

/** Days before connected-account earnings are paid out to the creator's bank. */
export const CREATOR_PAYOUT_DELAY_DAYS = 30;

/** Price (cents) where 20% of the subscriber charge equals the $5 platform minimum. */
export const TWENTY_PERCENT_FEE_THRESHOLD_CENTS = Math.ceil(
  (PLATFORM_FEE_MIN_CENTS * 100) / PLATFORM_FEE_PERCENT,
);

export type PlatformFeeBreakdown = {
  subscriberPriceCents: number;
  platformFeeCents: number;
  creatorEarningsCents: number;
  /** Human label for the fee rule applied, e.g. "$5 minimum" or "20%". */
  feeRuleLabel: string;
};

function percentFeeCents(subscriberPriceCents: number): number {
  return Math.round(subscriberPriceCents * (PLATFORM_FEE_PERCENT / 100));
}

/**
 * SmartKlass collects 20% of each subscriber payment or $5 minimum — whichever is higher.
 */
export function calculatePlatformFee(
  subscriberPriceCents: number,
): PlatformFeeBreakdown {
  if (subscriberPriceCents <= 0) {
    return {
      subscriberPriceCents: 0,
      platformFeeCents: 0,
      creatorEarningsCents: 0,
      feeRuleLabel: '',
    };
  }

  const percent = percentFeeCents(subscriberPriceCents);
  const platformFeeCents = Math.max(percent, PLATFORM_FEE_MIN_CENTS);
  const usesMinimum = platformFeeCents === PLATFORM_FEE_MIN_CENTS && percent < PLATFORM_FEE_MIN_CENTS;

  return {
    subscriberPriceCents,
    platformFeeCents,
    creatorEarningsCents: Math.max(subscriberPriceCents - platformFeeCents, 0),
    feeRuleLabel: usesMinimum ? '$5 minimum' : `${PLATFORM_FEE_PERCENT}%`,
  };
}

/** Stripe Connect application_fee_percent for fixed-price subscription plans. */
export function connectApplicationFeePercent(
  subscriberPriceCents: number,
  platformFeeCents: number,
): number {
  if (subscriberPriceCents <= 0) {
    return 0;
  }

  return (platformFeeCents / subscriberPriceCents) * 100;
}
