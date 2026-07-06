import { SetMetadata } from '@nestjs/common';
import type { AdminPermissionKey } from '../admin-permissions.constants';

export const ADMIN_PERMISSIONS_KEY = 'admin_permissions';

export const RequireAdminPermissions = (...permissions: AdminPermissionKey[]) =>
  SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);
