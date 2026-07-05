import { Test, TestingModule } from '@nestjs/testing';
import { CREATOR_PAYOUT_DELAY_DAYS } from '@smartklass/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { MarketplaceAccountingService } from './marketplace-accounting.service';
import { CreatorBillingService } from './creator-billing.service';
import { CreatorPayoutPolicyService } from './creator-payout-policy.service';
import { StripeClientService } from './stripe-client.service';

describe('CreatorBillingService payout delay', () => {
  let service: CreatorBillingService;

  const balanceSettingsMock = {
    update: jest.fn(),
    retrieve: jest.fn(),
  };

  const stripeMock = {
    balanceSettings: balanceSettingsMock,
    accounts: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
  };

  const stripeClientMock = {
    getClient: jest.fn(() => stripeMock),
    isConfigured: jest.fn(() => true),
  };

  const prismaMock = {
    creatorProfile: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  };

  const marketplaceAccountingMock = {
    getLedgerBalances: jest.fn(),
  };

  const payoutPolicyMock = {
    resolveDelayDays: jest.fn().mockResolvedValue(CREATOR_PAYOUT_DELAY_DAYS),
    canReceivePayouts: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorBillingService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StripeClientService, useValue: stripeClientMock },
        {
          provide: MarketplaceAccountingService,
          useValue: marketplaceAccountingMock,
        },
        {
          provide: CreatorPayoutPolicyService,
          useValue: payoutPolicyMock,
        },
      ],
    }).compile();

    service = module.get(CreatorBillingService);
  });

  it('sets 30-day hold via Balance Settings settlement_timing.delay_days_override', async () => {
    balanceSettingsMock.update.mockResolvedValue({
      payments: {
        settlement_timing: {
          delay_days: CREATOR_PAYOUT_DELAY_DAYS,
          delay_days_override: CREATOR_PAYOUT_DELAY_DAYS,
        },
      },
    });

    const delay = await service['syncConnectPayoutSchedule'](
      'acct_test',
      'creator_profile_test',
    );

    expect(balanceSettingsMock.update).toHaveBeenCalledWith(
      {
        payments: {
          payouts: {
            schedule: { interval: 'daily' },
          },
          settlement_timing: {
            delay_days_override: CREATOR_PAYOUT_DELAY_DAYS,
          },
        },
      },
      { stripeAccount: 'acct_test' },
    );
    expect(delay).toBe(CREATOR_PAYOUT_DELAY_DAYS);
  });

  it('reads verified payout delay from Balance Settings', async () => {
    balanceSettingsMock.retrieve.mockResolvedValue({
      payments: {
        settlement_timing: {
          delay_days: 2,
          delay_days_override: 30,
        },
      },
    });

    const delay = await service.getVerifiedConnectPayoutDelayDays('acct_test');

    expect(balanceSettingsMock.retrieve).toHaveBeenCalledWith(
      {},
      { stripeAccount: 'acct_test' },
    );
    expect(delay).toBe(30);
  });
});
