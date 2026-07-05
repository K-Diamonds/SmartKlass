import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  canCreatorReceivePayouts,
  defaultPayoutDelayForTrustLevel,
  resolvePayoutDelayDays,
} from '@smartklass/shared';
import { StaffGuard } from './guards/staff.guard';

describe('payout policy', () => {
  it('defaults new and standard creators to 30 days', () => {
    expect(defaultPayoutDelayForTrustLevel('NEW')).toBe(30);
    expect(defaultPayoutDelayForTrustLevel('STANDARD')).toBe(30);
  });

  it('blocks suspended creators from payouts', () => {
    expect(defaultPayoutDelayForTrustLevel('SUSPENDED')).toBeNull();
    expect(canCreatorReceivePayouts('SUSPENDED')).toBe(false);
    expect(
      resolvePayoutDelayDays({
        trustLevel: 'SUSPENDED',
        payoutDelayDays: 30,
      }),
    ).toBeNull();
  });
});

describe('StaffGuard', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'staff.userIds') {
        return ['staff-user-id'];
      }
      if (key === 'staff.emails') {
        return ['admin@smartklass.test'];
      }
      return [];
    }),
  } as unknown as ConfigService;

  const guard = new StaffGuard(configService);

  it('allows configured staff user ids', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'staff-user-id',
            email: 'admin@smartklass.test',
          },
        }),
      }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('allows staff actor when impersonating', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'learner-id',
            email: 'learner@test.com',
            impersonatorId: 'staff-user-id',
            impersonatorEmail: 'admin@smartklass.test',
          },
        }),
      }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('rejects non-staff users', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'random-user',
            email: 'user@test.com',
          },
        }),
      }),
    };

    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException);
  });
});
