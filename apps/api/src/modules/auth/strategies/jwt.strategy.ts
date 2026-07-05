import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@smartklass/database';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/database/prisma.service';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../../common/auth/interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('jwt.secret');

    if (!secret) {
      throw new Error('JWT_SECRET is not configured.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        email: payload.email,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        status: true,
        creatorProfile: {
          select: { id: true, deletedAt: true },
        },
      },
    });

    if (!user || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('User account is not available.');
    }

    const activeCreator =
      user.creatorProfile && user.creatorProfile.deletedAt === null
        ? user.creatorProfile
        : null;

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      creatorProfileId: activeCreator?.id ?? null,
    };
  }
}
