import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../common/database/prisma.service';
import {
  BecomeCreatorDto,
  CreatorProfileDto,
  CreatorPublicProfileDto,
  UpdateCreatorProfileDto,
} from './dto/creator.dto';

@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async becomeCreator(
    user: AuthenticatedUser,
    dto: BecomeCreatorDto,
  ): Promise<CreatorProfileDto> {
    const existingCreator = await this.prisma.creatorProfile.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    if (existingCreator) {
      throw new ConflictException('You already have a creator profile.');
    }

    const slugTaken = await this.prisma.creatorProfile.findFirst({
      where: {
        slug: dto.slug,
        deletedAt: null,
      },
    });

    if (slugTaken) {
      throw new ConflictException('This creator slug is already taken.');
    }

    const creatorProfile = await this.prisma.creatorProfile.create({
      data: {
        userId: user.id,
        slug: dto.slug,
        displayName: dto.displayName,
        headline: dto.headline,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
      },
    });

    return this.toCreatorProfile(creatorProfile);
  }

  async getMyProfile(user: AuthenticatedUser): Promise<CreatorProfileDto> {
    const creatorProfile = await this.prisma.creatorProfile.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!creatorProfile) {
      throw new NotFoundException('Creator profile not found.');
    }

    return this.toCreatorProfile(creatorProfile);
  }

  async updateMyProfile(
    user: AuthenticatedUser,
    dto: UpdateCreatorProfileDto,
  ): Promise<CreatorProfileDto> {
    const creatorProfile = await this.prisma.creatorProfile.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!creatorProfile) {
      throw new NotFoundException('Creator profile not found.');
    }

    if (dto.slug && dto.slug !== creatorProfile.slug) {
      const slugTaken = await this.prisma.creatorProfile.findFirst({
        where: {
          slug: dto.slug,
          deletedAt: null,
          NOT: { id: creatorProfile.id },
        },
      });

      if (slugTaken) {
        throw new ConflictException('This creator slug is already taken.');
      }
    }

    const profileData = Object.fromEntries(
      Object.entries({
        slug: dto.slug,
        displayName: dto.displayName,
        headline: dto.headline,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
      }).filter(([, value]) => value !== undefined),
    );

    const updated = await this.prisma.creatorProfile.update({
      where: { id: creatorProfile.id },
      data: profileData,
    });

    return this.toCreatorProfile(updated);
  }

  async getPublicProfile(slug: string): Promise<CreatorPublicProfileDto> {
    const creatorProfile = await this.prisma.creatorProfile.findFirst({
      where: {
        slug,
        deletedAt: null,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            courses: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!creatorProfile) {
      throw new NotFoundException('Creator not found.');
    }

    return {
      slug: creatorProfile.slug,
      displayName: creatorProfile.displayName,
      headline: creatorProfile.headline,
      bio: creatorProfile.bio,
      avatarUrl: creatorProfile.avatarUrl,
      isVerified: creatorProfile.isVerified,
      courseCount: creatorProfile._count.courses,
    };
  }

  private toCreatorProfile(creatorProfile: {
    id: string;
    userId: string;
    slug: string;
    displayName: string;
    headline: string | null;
    bio: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: Date;
  }): CreatorProfileDto {
    return {
      id: creatorProfile.id,
      userId: creatorProfile.userId,
      slug: creatorProfile.slug,
      displayName: creatorProfile.displayName,
      headline: creatorProfile.headline,
      bio: creatorProfile.bio,
      avatarUrl: creatorProfile.avatarUrl,
      isVerified: creatorProfile.isVerified,
      isActive: creatorProfile.isActive,
      createdAt: creatorProfile.createdAt.toISOString(),
    };
  }
}
