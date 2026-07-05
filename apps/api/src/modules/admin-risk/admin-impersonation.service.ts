import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AdminAuditTargetType } from '@smartklass/database';
import { JwtPayload } from '../../common/auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../common/database/prisma.service';
import { isStaffUser } from './guards/staff.guard';
import { AdminAuditService } from './admin-audit.service';

@Injectable()
export class AdminImpersonationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly audit: AdminAuditService,
  ) {}

  async impersonateUser(
    staffUserId: string,
    staffEmail: string,
    targetUserId: string,
    reason?: string | null,
    ipAddress?: string | null,
  ) {
    if (!isStaffUser(this.configService, staffUserId, staffEmail)) {
      throw new ForbiddenException('Staff access required.');
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true, email: true },
    });

    if (!target) {
      throw new NotFoundException('Target user not found.');
    }

    const expiresIn = '15m' as StringValue;
    const accessToken = await this.jwtService.signAsync(
      {
        sub: target.id,
        email: target.email,
        type: 'access',
        impersonatorId: staffUserId,
        impersonatorEmail: staffEmail,
      } satisfies JwtPayload,
      { expiresIn },
    );

    await this.audit.log({
      actorUserId: staffUserId,
      action: 'impersonate_user',
      targetType: AdminAuditTargetType.USER,
      targetId: targetUserId,
      reason,
      ipAddress,
      after: { impersonatedUserId: targetUserId },
    });

    return {
      accessToken,
      expiresIn: 900,
      impersonatedUserId: target.id,
      impersonatedEmail: target.email,
    };
  }
}
