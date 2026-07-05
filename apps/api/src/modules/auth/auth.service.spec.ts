import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from '@smartklass/database';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest
      .fn()
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token'),
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'jwt.secret': 'test-secret',
        'jwt.expiresIn': '1h',
        'jwt.refreshExpiresIn': '7d',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('creates a user with hashed password and returns tokens', async () => {
      let capturedPasswordHash = '';

      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockImplementation(
        (args: {
          data: { passwordHash: string; email: string; status: UserStatus };
        }) => {
          capturedPasswordHash = args.data.passwordHash;
          return Promise.resolve({
            id: 'user_1',
            email: 'alex@example.com',
            profile: { displayName: 'Alex Rivera' },
            creatorProfile: null,
          });
        },
      );
      jwtServiceMock.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register({
        email: 'alex@example.com',
        password: 'password123',
        displayName: 'Alex Rivera',
      });

      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(capturedPasswordHash).toMatch(/^\$2[aby]?\$/);
      const passwordMatches = await bcrypt.compare(
        'password123',
        capturedPasswordHash,
      );
      expect(passwordMatches).toBe(true);

      expect(result.user).toEqual({
        id: 'user_1',
        email: 'alex@example.com',
        displayName: 'Alex Rivera',
        isCreator: false,
        creatorProfileId: null,
      });
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
    });

    it('throws when email is already registered', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'alex@example.com',
          password: 'password123',
          displayName: 'Alex Rivera',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);

      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user_1',
        email: 'alex@example.com',
        passwordHash,
        status: UserStatus.ACTIVE,
        profile: { displayName: 'Alex Rivera' },
        creatorProfile: null,
      });
      prismaMock.user.update.mockResolvedValue({});
      jwtServiceMock.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        email: 'alex@example.com',
        password: 'password123',
      });

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_1' },
        }),
      );
      expect(result.user.email).toBe('alex@example.com');
      expect(result.tokens.accessToken).toBe('access-token');
    });

    it('throws for invalid credentials', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'alex@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
