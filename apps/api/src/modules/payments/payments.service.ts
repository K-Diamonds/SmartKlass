import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/database/prisma.service';
import { ListPaymentsQueryDto, PaymentDetailDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(
    user: AuthenticatedUser,
    query: ListPaymentsQueryDto,
  ): Promise<PaginatedResultDto<PaymentDetailDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = { userId: user.id };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          purchase: {
            include: {
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items: payments.map((payment) => this.toPaymentDto(payment)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getById(
    user: AuthenticatedUser,
    id: string,
  ): Promise<PaymentDetailDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        purchase: {
          include: {
            course: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (payment.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this payment.');
    }

    return this.toPaymentDto(payment);
  }

  private toPaymentDto(payment: {
    id: string;
    status: PaymentDetailDto['status'];
    amountCents: number;
    currency: string;
    paidAt: Date | null;
    createdAt: Date;
    stripePaymentIntentId: string | null;
    purchase?: {
      id: string;
      course: { id: string; title: string; slug: string };
    } | null;
  }): PaymentDetailDto {
    return {
      id: payment.id,
      status: payment.status,
      amountCents: payment.amountCents,
      currency: payment.currency,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      stripePaymentIntentId: payment.stripePaymentIntentId,
      purchase: payment.purchase
        ? {
            id: payment.purchase.id,
            courseId: payment.purchase.course.id,
            courseTitle: payment.purchase.course.title,
            courseSlug: payment.purchase.course.slug,
          }
        : null,
    };
  }
}
