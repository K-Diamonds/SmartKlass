import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class CreatorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      creatorProfileId?: string;
    }>();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    const creatorProfile = await this.prisma.creatorProfile.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });

    if (!creatorProfile) {
      throw new ForbiddenException(
        'A creator profile is required for this action.',
      );
    }

    request.creatorProfileId = creatorProfile.id;
    return true;
  }
}
