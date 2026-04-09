import { AdminLayout } from '../../common/views/admin-layout';
import type { Role } from './role.entity';

export class RolesViews {
  static list(
    roles: Role[],
    errorMessage?: string,
    showRolesMenu = true,
  ): string {
    const rows = roles
      .map(
        (role, index) => `
          <tr>
            <td style="padding:10px 12px;">${index + 1}</td>
            <td style="padding:10px 12px;">${this.escapeHtml(role.name)}</td>
            <td style="padding:10px 12px;">${this.escapeHtml(role.description ?? '-')}</td>
            <td style="padding:10px 12px;">${role.canAccessBackend ? 'Yes' : 'No'}</td>
            <td style="padding:10px 12px;">${this.formatDate(role.createdAt)}</td>
            <td style="padding:10px 12px;">${this.formatDate(role.updatedAt)}</td>
            <td style="padding:10px 12px;">
              <div style="display:flex; gap:8px; align-items:center;">
                <a class="btn" href="/roles/${role.id}/edit" style="text-decoration:none;">Edit</a>
                <form method="post" action="/roles/${role.id}/delete" style="display:inline;" onsubmit="return confirm('Delete this role?');">
                  <button class="btn" type="submit">Delete</button>
                </form>
              </div>
            </td>
          </tr>
        `,
      )
      .join('');

    const errorBlock = errorMessage
      ? `<p style="color:#fca5a5; margin:0 0 10px;">${this.escapeHtml(errorMessage)}</p>`
      : '';

    const navItems: Array<{ label: string; href: string; isActive?: boolean }> = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Users', href: '/users' },
      { label: 'FAQ', href: '/faqs' },
    ];
    if (showRolesMenu) {
      navItems.push({ label: 'Roles', href: '/roles', isActive: true });
    }

    return AdminLayout.render({
      title: 'Roles',
      pageTitle: 'Role Master',
      navItems,
      contentHtml: `
        <h1 style="margin:0 0 8px; font-size:26px; color:#f8fafc;">Role Master</h1>
        <p style="margin:0 0 14px; color:#94a3b8; font-size:13px;">Create and manage roles for your users.</p>
        ${errorBlock}
        <form method="post" action="/roles/create" style="display:grid; gap:10px; max-width:560px; margin-bottom:14px;">
          <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
            Role name *
            <input name="name" required maxlength="50" style="height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;" />
          </label>
          <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
            Description
            <input name="description" maxlength="255" style="height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;" />
          </label>
          <label style="display:flex; align-items:center; gap:8px; color:#cbd5e1; font-size:13px;">
            <input name="canAccessBackend" type="checkbox" style="width:16px; height:16px;" />
            Allow backend login access
          </label>
          <div><button class="btn btn-primary" type="submit">Create Role</button></div>
        </form>
        <div style="overflow:auto; border:1px solid rgba(148,163,184,0.18); border-radius:12px;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="text-align:left; color:#94a3b8; background: rgba(2,6,23,0.35);">
                <th style="padding:10px 12px;">SR</th>
                <th style="padding:10px 12px;">Role</th>
                <th style="padding:10px 12px;">Description</th>
                <th style="padding:10px 12px;">Backend Access</th>
                <th style="padding:10px 12px;">Created At</th>
                <th style="padding:10px 12px;">Updated At</th>
                <th style="padding:10px 12px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="7" style="padding:12px; color:#94a3b8;">No roles found.</td></tr>`}
            </tbody>
          </table>
        </div>
      `,
    });
  }

  static form(
    role: Role,
    errorMessage?: string,
    showRolesMenu = true,
  ): string {
    const errorBlock = errorMessage
      ? `<p style="color:#fca5a5; margin:0 0 10px;">${this.escapeHtml(errorMessage)}</p>`
      : '';

    const navItems: Array<{ label: string; href: string; isActive?: boolean }> = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Users', href: '/users' },
      { label: 'FAQ', href: '/faqs' },
    ];
    if (showRolesMenu) {
      navItems.push({ label: 'Roles', href: '/roles', isActive: true });
    }

    const safeName = this.escapeHtml(role.name);
    const safeDescription = this.escapeHtml(role.description ?? '');
    const checked = role.canAccessBackend ? 'checked' : '';

    return AdminLayout.render({
      title: 'Edit Role',
      pageTitle: 'Edit Role',
      navItems,
      contentHtml: `
        <h1 style="margin:0 0 8px; font-size:26px; color:#f8fafc;">Edit Role</h1>
        <p style="margin:0 0 14px; color:#94a3b8; font-size:13px;">Update role settings and backend access.</p>
        ${errorBlock}
        <form method="post" action="/roles/${role.id}/update" style="display:grid; gap:10px; max-width:560px;">
          <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
            Role name *
            <input name="name" value="${safeName}" required maxlength="50" style="height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;" />
          </label>
          <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
            Description
            <input name="description" value="${safeDescription}" maxlength="255" style="height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;" />
          </label>
          <label style="display:flex; align-items:center; gap:8px; color:#cbd5e1; font-size:13px;">
            <input name="canAccessBackend" type="checkbox" ${checked} style="width:16px; height:16px;" />
            Allow backend login access
          </label>
          <div style="display:flex; gap:10px; align-items:center;">
            <button class="btn btn-primary" type="submit">Update Role</button>
            <a class="btn" href="/roles" style="text-decoration:none;">Cancel</a>
          </div>
        </form>
      `,
    });
  }

  private static escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private static formatDate(value: Date | string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return this.escapeHtml(date.toLocaleString());
  }
}

