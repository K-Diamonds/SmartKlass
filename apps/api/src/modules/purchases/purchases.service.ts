import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/database/prisma.service';
import { ListPurchasesQueryDto, PurchaseDto } from './dto/purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(
    userId: string,
    query: ListPurchasesQueryDto,
  ): Promise<PaginatedResultDto<PurchaseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.userPurchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          course: {
            select: {
              slug: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.userPurchase.count({ where }),
    ]);

    return {
      items: items.map((purchase) => ({
        id: purchase.id,
        courseId: purchase.courseId,
        accessPlanId: purchase.accessPlanId,
        status: purchase.status,
        amountCents: purchase.amountCents,
        currency: purchase.currency,
        purchasedAt: purchase.purchasedAt?.toISOString() ?? null,
        expiresAt: purchase.expiresAt?.toISOString() ?? null,
        course: purchase.course,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getById(userId: string, id: string): Promise<PurchaseDto> {
    const purchase = await this.prisma.userPurchase.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        course: {
          select: {
            slug: true,
            title: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found.');
    }

    return {
      id: purchase.id,
      courseId: purchase.courseId,
      accessPlanId: purchase.accessPlanId,
      status: purchase.status,
      amountCents: purchase.amountCents,
      currency: purchase.currency,
      purchasedAt: purchase.purchasedAt?.toISOString() ?? null,
      expiresAt: purchase.expiresAt?.toISOString() ?? null,
      course: purchase.course,
    };
  }
}
