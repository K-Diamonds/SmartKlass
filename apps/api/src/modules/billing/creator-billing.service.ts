import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CERTIFICATE_ENABLEMENT_FEE_CENTS,
  CREATOR_PAYOUT_DELAY_DAYS,
  PLATFORM_FEE_MIN_CENTS,
  PLATFORM_FEE_PERCENT,
} from '@smartklass/shared';
import { PaymentStatus } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { MarketplaceAccountingService } from './marketplace-accounting.service';
import { CreatorPayoutPolicyService } from './creator-payout-policy.service';
import { StripeClientService } from './stripe-client.service';
import {
  StripeConnectLinkDto,
  StripeConnectStatusDto,
  CreatorPayoutSummaryDto,
} from './dto/billing.dto';

@Injectable()
export class CreatorBillingService {
  private readonly logger = new Logger(CreatorBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeClient: StripeClientService,
    private readonly marketplaceAccounting: MarketplaceAccountingService,
    private readonly payoutPolicy: CreatorPayoutPolicyService,
  ) {}

  async getWalletForUser(userId: string) {
    const profile = await this.prisma.creatorProfile.findFirst({
      where: { userId, deletedAt: null },
    });

    if (!profile) {
      throw new NotFoundException('Creator profile not found.');
    }

    return {
      availableBalanceCents: profile.availableBalanceCents,
      withdrawnBalanceCents: profile.withdrawnBalanceCents,
      certificateEnablementFeeCents: CERTIFICATE_ENABLEMENT_FEE_CENTS,
    };
  }

  async getPayoutSummaryForUser(
    userId: string,
  ): Promise<CreatorPayoutSummaryDto> {
    const profile = await this.getCreatorProfileOrThrow(userId);
    const currency = 'USD';
    const payoutDelayDays =
      (await this.payoutPolicy.resolveDelayDays(profile.id)) ??
      CREATOR_PAYOUT_DELAY_DAYS;
    const ledger = await this.marketplaceAccounting.getLedgerBalances(
      profile.id,
      currency,
    );

    const baseSummary: CreatorPayoutSummaryDto = {
      stripeConnected: false,
      availableBalanceCents: ledger.availableCents,
      pendingBalanceCents: ledger.pendingCents,
      ledgerPaidOutCents: ledger.paidOutCents,
      nextPayoutDate: null,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      platformFeeMinimumCents: PLATFORM_FEE_MIN_CENTS,
      stripeFeesCents: 0,
      payoutDelayDays,
      currency,
    };

    if (!profile.stripeConnectAccountId || !this.stripeClient.isConfigured()) {
      return baseSummary;
    }

    const stripe = this.stripeClient.getClient();
    const accountId = profile.stripeConnectAccountId;

    try {
      const [balance, pendingPayouts] = await Promise.all([
        stripe.balance.retrieve({}, { stripeAccount: accountId }),
        stripe.payouts.list(
          { limit: 1, status: 'pending' },
          { stripeAccount: accountId },
        ),
      ]);

      const availableBalanceCents = this.sumBalanceAmount(
        balance.available,
        currency,
      );
      const pendingBalanceCents = this.sumBalanceAmount(
        balance.pending,
        currency,
      );

      let nextPayoutDate: string | null = null;
      const pendingPayout = pendingPayouts.data[0];

      if (pendingPayout?.arrival_date) {
        nextPayoutDate = new Date(
          pendingPayout.arrival_date * 1000,
        ).toISOString();
      } else if (pendingBalanceCents > 0) {
        const estimated = new Date();
        estimated.setDate(estimated.getDate() + payoutDelayDays);
        nextPayoutDate = estimated.toISOString();
      } else if (availableBalanceCents > 0) {
        const estimated = new Date();
        estimated.setDate(estimated.getDate() + 1);
        nextPayoutDate = estimated.toISOString();
      }

      const stripeFeesCents = await this.sumRecentStripeFees(
        stripe,
        accountId,
      );

      return {
        stripeConnected: true,
        availableBalanceCents: ledger.availableCents,
        pendingBalanceCents: ledger.pendingCents,
        ledgerPaidOutCents: ledger.paidOutCents,
        nextPayoutDate,
        platformFeePercent: PLATFORM_FEE_PERCENT,
        platformFeeMinimumCents: PLATFORM_FEE_MIN_CENTS,
        stripeFeesCents,
        payoutDelayDays,
        currency,
      };
    } catch {
      return {
        ...baseSummary,
        stripeConnected: Boolean(profile.stripeConnectAccountId),
      };
    }
  }

  private sumBalanceAmount(
    entries: Array<{ amount: number; currency: string }>,
    currency: string,
  ): number {
    return entries
      .filter((entry) => entry.currency.toLowerCase() === currency.toLowerCase())
      .reduce((sum, entry) => sum + entry.amount, 0);
  }

  private async sumRecentStripeFees(
    stripe: ReturnType<StripeClientService['getClient']>,
    accountId: string,
  ): Promise<number> {
    const thirtyDaysAgo = Math.floor(
      (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000,
    );

    let stripeFeesCents = 0;
    let startingAfter: string | undefined;

    for (let page = 0; page < 5; page += 1) {
      const transactions = await stripe.balanceTransactions.list(
        {
          limit: 100,
          created: { gte: thirtyDaysAgo },
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        },
        { stripeAccount: accountId },
      );

      for (const transaction of transactions.data) {
        stripeFeesCents += transaction.fee;
      }

      if (!transactions.has_more || transactions.data.length === 0) {
        break;
      }

      startingAfter = transactions.data[transactions.data.length - 1]?.id;
    }

    return stripeFeesCents;
  }

  async getStripeConnectStatus(userId: string): Promise<StripeConnectStatusDto> {
    const profile = await this.getCreatorProfileOrThrow(userId);
    const stripeConfigured = this.stripeClient.isConfigured();
    const payoutDelayDays =
      (await this.payoutPolicy.resolveDelayDays(profile.id)) ??
      CREATOR_PAYOUT_DELAY_DAYS;

    if (!profile.stripeConnectAccountId) {
      return {
        connected: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        stripeConfigured,
        payoutDelayDays,
      };
    }

    if (!stripeConfigured) {
      return {
        connected: true,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        stripeConfigured: false,
        payoutDelayDays,
      };
    }

    try {
      const account = await this.stripeClient
        .getClient()
        .accounts.retrieve(profile.stripeConnectAccountId);

      await this.syncConnectPayoutSchedule(
        profile.stripeConnectAccountId,
        profile.id,
      );

      return {
        connected: true,
        payoutsEnabled: account.payouts_enabled ?? false,
        chargesEnabled: account.charges_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
        stripeConfigured: true,
        payoutDelayDays,
      };
    } catch {
      return {
        connected: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        stripeConfigured,
        payoutDelayDays,
      };
    }
  }

  async getConnectDestinationForCourse(
    creatorProfileId: string,
  ): Promise<string> {
    const profile = await this.prisma.creatorProfile.findFirst({
      where: {
        id: creatorProfileId,
        deletedAt: null,
      },
      select: {
        stripeConnectAccountId: true,
      },
    });

    if (!profile?.stripeConnectAccountId) {
      throw new BadRequestException(
        'This course is not available for purchase until the creator connects Stripe for payouts.',
      );
    }

    const canPayout = await this.payoutPolicy.canReceivePayouts(creatorProfileId);
    if (!canPayout) {
      throw new BadRequestException(
        'This course is temporarily unavailable while the creator account is under review.',
      );
    }

    const stripe = this.stripeClient.getClient();
    const account = await stripe.accounts.retrieve(profile.stripeConnectAccountId);

    await this.syncConnectPayoutSchedule(
      profile.stripeConnectAccountId,
      creatorProfileId,
    );

    if (!account.charges_enabled) {
      throw new BadRequestException(
        'This course is not available for purchase until the creator finishes Stripe setup.',
      );
    }

    if (account.capabilities?.transfers !== 'active') {
      throw new BadRequestException(
        'This course is not available for purchase until the creator Stripe account can receive transfers.',
      );
    }

    return profile.stripeConnectAccountId;
  }

  async syncConnectPayoutScheduleForCreator(creatorProfileId: string) {
    const profile = await this.prisma.creatorProfile.findFirst({
      where: { id: creatorProfileId, deletedAt: null },
      select: { stripeConnectAccountId: true },
    });

    if (!profile?.stripeConnectAccountId) {
      return null;
    }

    return this.syncConnectPayoutSchedule(
      profile.stripeConnectAccountId,
      creatorProfileId,
    );
  }

  private async syncConnectPayoutSchedule(
    accountId: string,
    creatorProfileId: string,
  ) {
    const stripe = this.stripeClient.getClient();
    const delayDays =
      (await this.payoutPolicy.resolveDelayDays(creatorProfileId)) ??
      CREATOR_PAYOUT_DELAY_DAYS;

    if (delayDays == null) {
      this.logger.warn(
        `Skipping Stripe payout schedule sync for suspended creator ${creatorProfileId}.`,
      );
      return null;
    }

    try {
      const settings = await stripe.balanceSettings.update(
        {
          payments: {
            payouts: {
              schedule: {
                interval: 'daily',
              },
            },
            settlement_timing: {
              delay_days_override: delayDays,
            },
          },
        },
        { stripeAccount: accountId },
      );

      const effectiveDelay =
        settings.payments.settlement_timing.delay_days_override ??
        settings.payments.settlement_timing.delay_days;

      if (effectiveDelay !== delayDays) {
        this.logger.warn(
          `Connect account ${accountId} payout delay is ${effectiveDelay} days, expected ${delayDays}. Stripe may have capped the override for this account country.`,
        );
      }

      return effectiveDelay;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Stripe error';

      this.logger.warn(
        `Could not sync Balance Settings payout delay for ${accountId}: ${message}`,
      );

      return null;
    }
  }

  async getVerifiedConnectPayoutDelayDays(
    accountId: string,
  ): Promise<number | null> {
    const stripe = this.stripeClient.getClient();

    try {
      const settings = await stripe.balanceSettings.retrieve(
        {},
        { stripeAccount: accountId },
      );

      return (
        settings.payments.settlement_timing.delay_days_override ??
        settings.payments.settlement_timing.delay_days ??
        null
      );
    } catch {
      return null;
    }
  }

  async createStripeConnectOnboardingLink(
    userId: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<StripeConnectLinkDto> {
    const stripe = this.stripeClient.getClient();
    const profile = await this.getCreatorProfileOrThrow(userId);
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let accountId = profile.stripeConnectAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: {
          userId,
          creatorProfileId: profile.id,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      await this.prisma.creatorProfile.update({
        where: { id: profile.id },
        data: { stripeConnectAccountId: accountId },
      });

      await this.syncConnectPayoutSchedule(accountId, profile.id);
    } else {
      await this.syncConnectPayoutSchedule(accountId, profile.id);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    if (!link.url) {
      throw new BadRequestException('Stripe onboarding link could not be created.');
    }

    return { url: link.url };
  }

  async createStripeConnectDashboardLink(
    userId: string,
  ): Promise<StripeConnectLinkDto> {
    const stripe = this.stripeClient.getClient();
    const profile = await this.getCreatorProfileOrThrow(userId);

    if (!profile.stripeConnectAccountId) {
      throw new BadRequestException(
        'Connect your Stripe account before managing payout settings.',
      );
    }

    const link = await stripe.accounts.createLoginLink(
      profile.stripeConnectAccountId,
    );

    if (!link.url) {
      throw new BadRequestException('Stripe dashboard link could not be created.');
    }

    return { url: link.url };
  }

  async creditEarnings(creatorProfileId: string, amountCents: number) {
    if (amountCents <= 0) {
      return;
    }

    await this.prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data: {
        availableBalanceCents: { increment: amountCents },
      },
    });
  }

  async enableCertificateWithBalance(
    creatorProfileId: string,
    courseId: string,
  ) {
    const course = await this.getOwnedCourseOrThrow(creatorProfileId, courseId);

    if (course.offersCertificate) {
      throw new BadRequestException('Certificate is already enabled for this course.');
    }

    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
    });

    if (!profile) {
      throw new NotFoundException('Creator profile not found.');
    }

    if (profile.availableBalanceCents < CERTIFICATE_ENABLEMENT_FEE_CENTS) {
      throw new BadRequestException(
        'Insufficient account balance to enable the certificate.',
      );
    }

    const paidAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.creatorProfile.update({
        where: { id: creatorProfileId },
        data: {
          availableBalanceCents: {
            decrement: CERTIFICATE_ENABLEMENT_FEE_CENTS,
          },
        },
      });

      const updatedCourse = await tx.course.update({
        where: { id: courseId },
        data: {
          offersCertificate: true,
          certificatePaidAt: paidAt,
        },
      });

      await tx.payment.create({
        data: {
          userId: profile.userId,
          status: PaymentStatus.SUCCEEDED,
          amountCents: CERTIFICATE_ENABLEMENT_FEE_CENTS,
          currency: 'USD',
          paidAt,
          metadata: {
            purpose: 'certificate_enablement',
            courseId,
            creatorProfileId,
            paymentMethod: 'balance',
          },
        },
      });

      return {
        courseId: updatedCourse.id,
        offersCertificate: updatedCourse.offersCertificate,
        certificatePaidAt: updatedCourse.certificatePaidAt?.toISOString() ?? null,
        availableBalanceCents: updatedProfile.availableBalanceCents,
      };
    });
  }

  async fulfillCertificateStripePayment(input: {
    userId: string;
    creatorProfileId: string;
    courseId: string;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId?: string | null;
  }) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: input.courseId,
        creatorProfileId: input.creatorProfileId,
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found for certificate payment.');
    }

    if (course.offersCertificate) {
      return {
        courseId: course.id,
        offersCertificate: true,
        certificatePaidAt: course.certificatePaidAt?.toISOString() ?? null,
      };
    }

    const paidAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          userId: input.userId,
          status: PaymentStatus.SUCCEEDED,
          amountCents: CERTIFICATE_ENABLEMENT_FEE_CENTS,
          currency: 'USD',
          stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
          paidAt,
          metadata: {
            purpose: 'certificate_enablement',
            courseId: input.courseId,
            creatorProfileId: input.creatorProfileId,
            paymentMethod: 'stripe',
            checkoutSessionId: input.stripeCheckoutSessionId,
          },
        },
      });

      await tx.course.update({
        where: { id: input.courseId },
        data: {
          offersCertificate: true,
          certificatePaidAt: paidAt,
        },
      });
    });

    return {
      courseId: input.courseId,
      offersCertificate: true,
      certificatePaidAt: paidAt.toISOString(),
    };
  }

  private async getOwnedCourseOrThrow(creatorProfileId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        creatorProfileId,
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }

  private async getCreatorProfileOrThrow(userId: string) {
    const profile = await this.prisma.creatorProfile.findFirst({
      where: { userId, deletedAt: null },
    });

    if (!profile) {
      throw new NotFoundException('Creator profile not found.');
    }

    return profile;
  }
}
