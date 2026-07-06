import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessPlanType } from '@smartklass/database';
import { SUBSCRIBER_PRICE_MIN_CENTS } from '@smartklass/shared';
import { CourseOwnershipService } from '../../common/courses/course-ownership.service';
import { PrismaService } from '../../common/database/prisma.service';
import {
  AccessPlanDto,
  CreateAccessPlanDto,
  UpdateAccessPlanDto,
} from './dto/access-plan.dto';

@Injectable()
export class AccessPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: CourseOwnershipService,
  ) {}

  async listByCourse(courseId: string): Promise<AccessPlanDto[]> {
    await this.ownership.getPublishedCourseOrThrow(courseId);

    const plans = await this.prisma.accessPlan.findMany({
      where: {
        courseId,
        deletedAt: null,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        features: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return plans.map((plan) => this.toDto(plan));
  }

  async listMineByCourse(
    creatorProfileId: string,
    courseId: string,
  ): Promise<AccessPlanDto[]> {
    await this.ownership.assertOwnsCourse(creatorProfileId, courseId);

    const plans = await this.prisma.accessPlan.findMany({
      where: {
        courseId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        features: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return plans.map((plan) => this.toDto(plan));
  }

  async create(
    creatorProfileId: string,
    courseId: string,
    dto: CreateAccessPlanDto,
  ): Promise<AccessPlanDto> {
    await this.ownership.assertOwnsCourse(creatorProfileId, courseId);

    if (dto.planType === AccessPlanType.SUBSCRIPTION && !dto.billingInterval) {
      throw new BadRequestException(
        'Subscription plans require a weekly, monthly, or yearly billing interval.',
      );
    }

    const priceCents = dto.priceCents ?? 0;
    this.assertValidPaidPrice(dto.planType, priceCents);

    const sortOrder = await this.prisma.accessPlan.count({
      where: { courseId, deletedAt: null },
    });

    const plan = await this.prisma.accessPlan.create({
      data: {
        courseId,
        name: dto.name,
        description: dto.description,
        planType: dto.planType,
        priceCents:
          dto.priceCents ?? (dto.planType === AccessPlanType.FREE ? 0 : 0),
        currency: dto.currency ?? 'USD',
        billingInterval: dto.billingInterval,
        accessDurationDays: dto.accessDurationDays,
        sortOrder,
        features: dto.features
          ? {
              create: dto.features.map((feature, index) => ({
                key: feature.key,
                label: feature.label,
                description: feature.description,
                sortOrder: feature.sortOrder ?? index,
              })),
            }
          : undefined,
      },
      include: {
        features: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.toDto(plan);
  }

  async update(
    creatorProfileId: string,
    planId: string,
    dto: UpdateAccessPlanDto,
  ): Promise<AccessPlanDto> {
    const plan = await this.prisma.accessPlan.findFirst({
      where: {
        id: planId,
        deletedAt: null,
      },
    });

    if (!plan) {
      throw new NotFoundException('Access plan not found.');
    }

    await this.ownership.assertOwnsCourse(creatorProfileId, plan.courseId);

    if (dto.priceCents !== undefined) {
      this.assertValidPaidPrice(plan.planType, dto.priceCents);
    }

    const data = Object.fromEntries(
      Object.entries({
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        isActive: dto.isActive,
      }).filter(([, value]) => value !== undefined),
    );

    const updated = await this.prisma.accessPlan.update({
      where: { id: planId },
      data,
      include: {
        features: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.toDto(updated);
  }

  private assertValidPaidPrice(
    planType: AccessPlanType,
    priceCents: number,
  ): void {
    if (planType === AccessPlanType.FREE) {
      return;
    }

    if (priceCents < SUBSCRIBER_PRICE_MIN_CENTS) {
      throw new BadRequestException(
        `Paid plans must be at least $${(SUBSCRIBER_PRICE_MIN_CENTS / 100).toFixed(2)}. At that price, SmartKlass keeps the full amount and creator earnings are $0.`,
      );
    }
  }

  private toDto(plan: {
    id: string;
    courseId: string;
    name: string;
    description: string | null;
    planType: AccessPlanDto['planType'];
    priceCents: number;
    currency: string;
    billingInterval: AccessPlanDto['billingInterval'];
    accessDurationDays: number | null;
    isActive: boolean;
    features: Array<{
      key: string;
      label: string;
      description: string | null;
      sortOrder: number;
    }>;
  }): AccessPlanDto {
    return {
      id: plan.id,
      courseId: plan.courseId,
      name: plan.name,
      description: plan.description,
      planType: plan.planType,
      priceCents: plan.priceCents,
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      accessDurationDays: plan.accessDurationDays,
      isActive: plan.isActive,
      features: plan.features.map((feature) => ({
        key: feature.key,
        label: feature.label,
        description: feature.description,
        sortOrder: feature.sortOrder,
      })),
    };
  }
}
