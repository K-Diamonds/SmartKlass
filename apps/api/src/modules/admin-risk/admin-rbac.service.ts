import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRoleKey } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import {
  ALL_ADMIN_PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSION_MAP,
} from './admin-permissions.constants';

@Injectable()
export class AdminRbacService implements OnModuleInit {
  private readonly logger = new Logger(AdminRbacService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedRolesAndPermissions();
    await this.bootstrapStaffFromEnv();
    await this.bootstrapRoleAssignmentsFromEnv();
  }

  async seedRolesAndPermissions() {
    for (const key of ALL_ADMIN_PERMISSIONS) {
      await this.prisma.adminPermission.upsert({
        where: { key },
        create: { key, description: key },
        update: {},
      });
    }

    for (const roleKey of Object.values(AdminRoleKey)) {
      const role = await this.prisma.adminRole.upsert({
        where: { key: roleKey },
        create: {
          key: roleKey,
          name: ROLE_LABELS[roleKey],
          description: `${ROLE_LABELS[roleKey]} role`,
        },
        update: { name: ROLE_LABELS[roleKey] },
      });

      const permissionKeys = ROLE_PERMISSION_MAP[roleKey];
      const permissions = await this.prisma.adminPermission.findMany({
        where: { key: { in: permissionKeys } },
      });

      for (const permission of permissions) {
        await this.prisma.adminRolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
          update: {},
        });
      }
    }
  }

  async bootstrapStaffFromEnv() {
    const staffEmails =
      this.configService.get<string[]>('staff.emails') ?? [];
    const staffUserIds =
      this.configService.get<string[]>('staff.userIds') ?? [];

    if (staffEmails.length === 0 && staffUserIds.length === 0) {
      return;
    }

    const superAdminRole = await this.prisma.adminRole.findUnique({
      where: { key: AdminRoleKey.SUPER_ADMIN },
    });

    if (!superAdminRole) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          ...(staffUserIds.length > 0 ? [{ id: { in: staffUserIds } }] : []),
          ...(staffEmails.length > 0
            ? [{ email: { in: staffEmails.map((e) => e.toLowerCase()) } }]
            : []),
        ],
      },
      select: { id: true, email: true },
    });

    for (const user of users) {
      await this.prisma.adminUserRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: superAdminRole.id,
          },
        },
        create: {
          userId: user.id,
          roleId: superAdminRole.id,
        },
        update: {},
      });
      this.logger.log(`Bootstrapped SUPER_ADMIN for ${user.email}`);
    }
  }

  async bootstrapRoleAssignmentsFromEnv() {
    const assignments =
      this.configService.get<Array<{ identifier: string; role: string }>>(
        'adminRoleAssignments',
      ) ?? [];

    if (assignments.length === 0) {
      return;
    }

    const staffEmails = new Set(
      (this.configService.get<string[]>('staff.emails') ?? []).map((e) =>
        e.toLowerCase(),
      ),
    );
    const staffUserIds = new Set(
      this.configService.get<string[]>('staff.userIds') ?? [],
    );

    for (const { identifier, role } of assignments) {
      if (
        !Object.values(AdminRoleKey).includes(role as AdminRoleKey)
      ) {
        this.logger.warn(`Skipping unknown admin role: ${role}`);
        continue;
      }

      const roleRecord = await this.prisma.adminRole.findUnique({
        where: { key: role as AdminRoleKey },
      });
      if (!roleRecord) {
        continue;
      }

      const isEmail = identifier.includes('@');
      const normalizedIdentifier = isEmail
        ? identifier.toLowerCase()
        : identifier;

      if (
        (isEmail && staffEmails.has(normalizedIdentifier)) ||
        (!isEmail && staffUserIds.has(normalizedIdentifier))
      ) {
        this.logger.log(
          `Skipping ${identifier}:${role} — SUPER_ADMIN assigned via staff allowlist`,
        );
        continue;
      }

      const user = await this.prisma.user.findFirst({
        where: isEmail
          ? { email: normalizedIdentifier, deletedAt: null }
          : { id: normalizedIdentifier, deletedAt: null },
        select: { id: true, email: true },
      });

      if (!user) {
        this.logger.warn(`No user found for admin role assignment: ${identifier}`);
        continue;
      }

      await this.prisma.adminUserRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: roleRecord.id,
          },
        },
        create: {
          userId: user.id,
          roleId: roleRecord.id,
        },
        update: {},
      });

      this.logger.log(`Assigned ${role} to ${user.email}`);
    }
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const roles = await this.prisma.adminUserRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const keys = new Set<string>();
    for (const userRole of roles) {
      for (const rp of userRole.role.rolePermissions) {
        keys.add(rp.permission.key);
      }
    }
    return [...keys];
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  async hasAnyPermission(
    userId: string,
    required: string[],
  ): Promise<boolean> {
    if (required.length === 0) return true;
    const permissions = await this.getUserPermissions(userId);
    return required.some((p) => permissions.includes(p));
  }

  async isAdminUser(userId: string): Promise<boolean> {
    const count = await this.prisma.adminUserRole.count({ where: { userId } });
    return count > 0;
  }

  async getUserRoles(userId: string) {
    return this.prisma.adminUserRole.findMany({
      where: { userId },
      include: { role: true },
    });
  }
}
