export type UserRoleLike = {
  role?: string | null;
};

export function normalizeRoleName(role: string): string {
  return role.trim().toLowerCase().replaceAll('_', ' ').replace(/\s+/g, ' ');
}

export function isSuperAdminUser(user: UserRoleLike | null | undefined): boolean {
  const role = user?.role;
  if (!role) {
    return false;
  }
  return normalizeRoleName(role) === 'super admin';
}
