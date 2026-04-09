import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const BACKEND_ACCESS_POLICY = 'backend_access';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

