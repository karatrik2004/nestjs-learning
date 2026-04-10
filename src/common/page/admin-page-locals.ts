import type { AdminNavKey } from '../views/admin-nav-items';
import { buildAdminNavItems } from '../views/admin-nav-items';

export type AdminPageUserLike = {
  email?: string | null;
  role?: string | null;
};

type BuildAdminPageLocalsInput = {
  user: AdminPageUserLike | null;
  showRolesMenu: boolean;
  active: AdminNavKey;
  title: string;
  pageTitle: string;
};

export function buildAdminPageLocals(input: BuildAdminPageLocalsInput) {
  const { user, showRolesMenu, active, title, pageTitle } = input;
  const year = new Date().getFullYear();
  return {
    title,
    pageTitle,
    userLabel:
      user?.email && user?.role
        ? `Signed in as ${user.email} (${user.role})`
        : 'Signed in',
    navItems: buildAdminNavItems(active, showRolesMenu),
    footerLeft: `© ${year} NestJS Admin`,
    footerRight: 'JWT + Refresh + Guards',
  };
}
