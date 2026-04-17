export type AdminNavKey = 'dashboard' | 'users' | 'roles' | 'faq' | 'settings';

export type AdminNavItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

const HREF_BY_KEY: Record<AdminNavKey, string> = {
  dashboard: '/dashboard',
  users: '/users',
  roles: '/roles',
  faq: '/faqs',
  settings: '/settings',
};

/**
 * Sidebar navigation for all admin HTML modules.
 */
export function buildAdminNavItems(
  active: AdminNavKey,
  showRolesMenu: boolean,
): AdminNavItem[] {
  const items: AdminNavItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Users', href: '/users' },
    { label: 'FAQ', href: '/faqs' },
    { label: 'Settings', href: '/settings' },
  ];
  if (showRolesMenu) {
    items.push({ label: 'Roles', href: '/roles' });
  }

  const target = HREF_BY_KEY[active];
  for (const item of items) {
    if (item.href === target) {
      item.isActive = true;
    }
  }

  return items;
}
