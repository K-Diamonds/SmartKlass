/** Default ledger + Stripe Connect payout hold for new/standard creators. */
export const DEFAULT_PAYOUT_DELAY_DAYS = 30;

/** Allowed payout holds for trusted creators (admin may choose 7 or 14). */
export const TRUSTED_PAYOUT_DELAY_OPTIONS = [7, 14] as const;

/** Allowed payout holds for high-risk creators (admin may choose 45 or 60). */
export const HIGH_RISK_PAYOUT_DELAY_OPTIONS = [45, 60] as const;

export type CreatorTrustLevel =
  | 'NEW'
  | 'STANDARD'
  | 'TRUSTED'
  | 'HIGH_RISK'
  | 'SUSPENDED';

export function defaultPayoutDelayForTrustLevel(
  trustLevel: CreatorTrustLevel,
): number | null {
  switch (trustLevel) {
    case 'NEW':
    case 'STANDARD':
      return DEFAULT_PAYOUT_DELAY_DAYS;
    case 'TRUSTED':
      return TRUSTED_PAYOUT_DELAY_OPTIONS[1];
    case 'HIGH_RISK':
      return HIGH_RISK_PAYOUT_DELAY_OPTIONS[0];
    case 'SUSPENDED':
      return null;
    default:
      return DEFAULT_PAYOUT_DELAY_DAYS;
  }
}

export function resolvePayoutDelayDays(input: {
  trustLevel: CreatorTrustLevel;
  payoutDelayDays?: number | null;
}): number | null {
  if (input.trustLevel === 'SUSPENDED') {
    return null;
  }

  if (input.payoutDelayDays != null && input.payoutDelayDays > 0) {
    return input.payoutDelayDays;
  }

  return defaultPayoutDelayForTrustLevel(input.trustLevel);
}

export function canCreatorReceivePayouts(trustLevel: CreatorTrustLevel): boolean {
  return trustLevel !== 'SUSPENDED';
}
