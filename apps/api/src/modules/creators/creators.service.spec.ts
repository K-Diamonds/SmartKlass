import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { UserStatus } from '@smartklass/database';
import { CreatorsService } from './creators.service';

describe('CreatorsService', () => {
  let service: CreatorsService;

  const prismaMock = {
    creatorProfile: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const authenticatedUser: AuthenticatedUser = {
    id: 'user_1',
    email: 'alex@example.com',
    status: UserStatus.ACTIVE,
    creatorProfileId: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CreatorsService>(CreatorsService);
  });

  describe('becomeCreator', () => {
    it('creates a creator profile for the authenticated user', async () => {
      prismaMock.creatorProfile.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prismaMock.creatorProfile.create.mockResolvedValue({
        id: 'creator_1',
        userId: 'user_1',
        slug: 'alex-rivera',
        displayName: 'Alex Rivera',
        headline: 'Home cook',
        bio: 'Teaching weeknight meals.',
        avatarUrl: null,
        isVerified: false,
        isActive: true,
        createdAt: new Date('2026-07-04T12:00:00.000Z'),
      });

      const result = await service.becomeCreator(authenticatedUser, {
        slug: 'alex-rivera',
        displayName: 'Alex Rivera',
        headline: 'Home cook',
        bio: 'Teaching weeknight meals.',
      });

      expect(prismaMock.creatorProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_1',
          slug: 'alex-rivera',
          displayName: 'Alex Rivera',
          headline: 'Home cook',
          bio: 'Teaching weeknight meals.',
          avatarUrl: undefined,
        },
      });

      expect(result).toEqual({
        id: 'creator_1',
        userId: 'user_1',
        slug: 'alex-rivera',
        displayName: 'Alex Rivera',
        headline: 'Home cook',
        bio: 'Teaching weeknight meals.',
        avatarUrl: null,
        isVerified: false,
        isActive: true,
        createdAt: '2026-07-04T12:00:00.000Z',
      });
    });

    it('throws when the user already has a creator profile', async () => {
      prismaMock.creatorProfile.findFirst.mockResolvedValueOnce({
        id: 'creator_existing',
      });

      await expect(
        service.becomeCreator(authenticatedUser, {
          slug: 'alex-rivera',
          displayName: 'Alex Rivera',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws when slug is already taken', async () => {
      prismaMock.creatorProfile.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'creator_other' });

      await expect(
        service.becomeCreator(authenticatedUser, {
          slug: 'alex-rivera',
          displayName: 'Alex Rivera',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
