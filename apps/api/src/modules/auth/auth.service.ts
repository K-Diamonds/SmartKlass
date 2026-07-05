import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@smartklass/database';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { PrismaService } from '../../common/database/prisma.service';
import { JwtPayload } from '../../common/auth/interfaces/authenticated-user.interface';
import {
  AuthResponseDto,
  AuthTokensDto,
  AuthUserDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            displayName: dto.displayName,
          },
        },
      },
      include: {
        profile: true,
        creatorProfile: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: this.toAuthUser(user),
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        deletedAt: null,
      },
      include: {
        profile: true,
        creatorProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('This account has been suspended.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: this.toAuthUser(user),
      tokens,
    };
  }

  logout(): Promise<{ message: string }> {
    return Promise.resolve({
      message:
        'Logout acknowledged. Token invalidation will be added in a future release.',
    });
  }

  refresh(dto: RefreshTokenDto): Promise<AuthTokensDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.getJwtSecret(),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      return this.generateTokens(payload.sub, payload.email);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      include: {
        profile: true,
        creatorProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return this.toAuthUser(user);
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokensDto> {
    const accessExpiresIn =
      this.configService.get<string>('jwt.expiresIn') ?? '1h';
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, type: 'access' } satisfies JwtPayload,
      { expiresIn: accessExpiresIn as StringValue },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, type: 'refresh' } satisfies JwtPayload,
      { expiresIn: refreshExpiresIn as StringValue },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresInSeconds(accessExpiresIn),
    };
  }

  private getJwtSecret(): string {
    const secret = this.configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured.');
    }
    return secret;
  }

  private parseExpiresInSeconds(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
      return 3600;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return amount;
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 3600;
      case 'd':
        return amount * 86400;
      default:
        return 3600;
    }
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    profile: { displayName: string } | null;
    creatorProfile: { id: string; deletedAt?: Date | null } | null;
  }): AuthUserDto {
    const isActiveCreator = Boolean(
      user.creatorProfile && user.creatorProfile.deletedAt == null,
    );

    return {
      id: user.id,
      email: user.email,
      displayName: user.profile?.displayName ?? user.email,
      isCreator: isActiveCreator,
      creatorProfileId: isActiveCreator ? user.creatorProfile!.id : null,
    };
  }
}
