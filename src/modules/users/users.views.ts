import type { User } from './user.entity';
import { AdminLayout } from '../../common/views/admin-layout';
import type { UsersListFilters } from './users.service';

type FormData = {
  name?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  roleId?: number;
  roleOptions?: Array<{ id: number; name: string }>;
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
};

export class UsersViews {
  static list(
    users: User[],
    filters?: UsersListFilters,
    showRolesMenu = true,
  ): string {
    const safeSearch = this.escapeHtml(filters?.search ?? '');
    const safeRole = this.escapeHtml(filters?.role ?? '');
    const rows = users
      .map(
        (user, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${this.escapeHtml(user.name ?? '-')}</td>
            <td>${this.escapeHtml(user.email)}</td>
            <td>${this.escapeHtml(user.phone ?? '-')}</td>
            <td>${this.escapeHtml(user.roleMaster?.name ?? '-')}</td>
            <td>${
              user.profileImage
                ? `<img src="${this.escapeHtml(
                    user.profileImage,
                  )}" alt="profile" style="width:40px;height:40px;object-fit:cover;border-radius:50%;" />`
                : '-'
            }</td>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <a href="/users/${user.id}/edit" title="Edit" aria-label="Edit" style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(148,163,184,0.10); text-decoration:none;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.1l-1.9-1.9a1.5 1.5 0 0 0-2.1 0L6 16v4z" stroke="#7dd3fc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13.5 6.5l4 4" stroke="#7dd3fc" stroke-width="1.8" stroke-linecap="round"/>
                  </svg>
                </a>
                <form method="post" action="/users/${user.id}/delete" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete this user?');">
                  <button type="submit" title="Delete" aria-label="Delete" style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:10px; border:1px solid rgba(239,68,68,0.35); background: rgba(239,68,68,0.12); cursor:pointer;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 7h16" stroke="#fca5a5" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M10 11v7" stroke="#fca5a5" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M14 11v7" stroke="#fca5a5" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M6 7l1 14h10l1-14" stroke="#fca5a5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M9 7V4h6v3" stroke="#fca5a5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </form>
              </div>
            </td>
          </tr>
        `,
      )
      .join('');

    const navItems = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Users', href: '/users', isActive: true },
      { label: 'FAQ', href: '/faqs' },
    ];
    if (showRolesMenu) {
      navItems.push({ label: 'Roles', href: '/roles' });
    }

    return AdminLayout.render({
      title: 'Users',
      pageTitle: 'Users',
      navItems,
      contentHtml: `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div>
            <h1 style="margin:0; font-size:26px; color:#f8fafc;">Users</h1>
            <p style="margin:6px 0 0; color:#94a3b8; font-size:13px;">Create, edit, delete users and manage profile images.</p>
          </div>
          <a class="btn btn-primary" href="/users/new" style="text-decoration:none;">Add User</a>
        </div>
        <form method="get" action="/users" style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
          <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
            Search
            <input name="search" value="${safeSearch}" placeholder="name, email, phone" style="width:260px; height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;" />
          </label>
          <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
            Role
            <select name="role" style="width:160px; height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 10px;">
              <option value="" ${safeRole === '' ? 'selected' : ''}>All roles</option>
              <option value="admin" ${safeRole === 'admin' ? 'selected' : ''}>Admin</option>
              <option value="user" ${safeRole === 'user' ? 'selected' : ''}>User</option>
            </select>
          </label>
          <button class="btn btn-primary" type="submit">Apply</button>
          <a class="btn" href="/users" style="text-decoration:none;">Reset</a>
        </form>
        <div style="margin-top:14px; overflow:auto; border:1px solid rgba(148,163,184,0.18); border-radius:14px;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background: rgba(2,6,23,0.35); text-align:left;">
                <th style="padding:10px 12px;">ID</th>
                <th style="padding:10px 12px;">Name</th>
                <th style="padding:10px 12px;">Email</th>
                <th style="padding:10px 12px;">Phone</th>
                <th style="padding:10px 12px;">Role</th>
                <th style="padding:10px 12px;">Image</th>
                <th style="padding:10px 12px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `,
    });
  }

  static form(
    title: string,
    action: string,
    data?: FormData,
    showRolesMenu = true,
  ): string {
    const errorBlock = data?.errorMessage
      ? `<p style="color:#b91c1c;font-weight:bold;">${this.escapeHtml(
          data.errorMessage,
        )}</p>`
      : '';
    const fieldErrors = data?.fieldErrors ?? {};

    const isEdit = title === 'Edit User';
    const safeName = this.escapeHtml(data?.name ?? '');
    const safeEmail = this.escapeHtml(data?.email ?? '');
    const safePhone = this.escapeHtml(data?.phone ?? '');
    const selectedRoleId = data?.roleId ?? 0;
    const roleOptions = data?.roleOptions ?? [];
    const roleOptionsHtml = roleOptions
      .map((role) => {
        const isSelected = selectedRoleId === role.id;
        const safeLabel = this.escapeHtml(role.name);
        return `<option value="${role.id}" ${isSelected ? 'selected' : ''}>${safeLabel}</option>`;
      })
      .join('');
    const imagePreview = data?.profileImage
      ? `<img src="${this.escapeHtml(
          data.profileImage,
        )}" alt="profile" style="width:64px;height:64px;object-fit:cover;border-radius:50%;border:1px solid rgba(148,163,184,0.18);" />`
      : '';

    const navItems = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Users', href: '/users', isActive: true },
      { label: 'FAQ', href: '/faqs' },
    ];
    if (showRolesMenu) {
      navItems.push({ label: 'Roles', href: '/roles' });
    }

    return AdminLayout.render({
      title,
      pageTitle: isEdit ? 'Edit User' : 'Create User',
      navItems,
      contentHtml: `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div>
            <h1 style="margin:0; font-size:26px; color:#f8fafc;">${this.escapeHtml(title)}</h1>
            <p style="margin:6px 0 0; color:#94a3b8; font-size:13px;">${isEdit ? 'Update user details.' : 'Create a new user.'}</p>
          </div>
          <a class="btn" href="/users" style="text-decoration:none;">Back to Users</a>
        </div>
        <div style="margin-top:14px;">
          ${errorBlock}
          <form method="post" action="${action}" enctype="multipart/form-data" style="display:grid; gap:12px; max-width:640px;">
            <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
              Name
              <input name="name" value="${safeName}" style="height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;" />
              ${this.fieldError(fieldErrors, 'name')}
            </label>
            <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
              Email *
              <input name="email" type="email" value="${safeEmail}" style="height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;" />
              ${this.fieldError(fieldErrors, 'email')}
            </label>
            <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
              Phone
              <input name="phone" value="${safePhone}" style="height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;" />
              ${this.fieldError(fieldErrors, 'phone')}
            </label>
            <label style="display:grid; gap:8px; color:#cbd5e1; font-size:13px;">
              Profile Image
              <div style="display:flex; align-items:center; gap:12px;">
                ${imagePreview || '<span style="color:#94a3b8;">No image</span>'}
                <input name="profileImage" type="file" accept="image/*" />
              </div>
            </label>
            <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
              Role
              <select name="roleId" style="height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;">
                <option value="">Select role</option>
                ${roleOptionsHtml}
              </select>
              ${this.fieldError(fieldErrors, 'roleId')}
            </label>
            <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
              Password ${isEdit ? '(leave blank to keep current)' : '*'}
              <input name="password" type="password" ${isEdit ? '' : 'required'} style="height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;" />
              ${this.fieldError(fieldErrors, 'password')}
            </label>
            <div style="display:flex; gap:10px; align-items:center; margin-top:4px;">
              <button class="btn btn-primary" type="submit">Save</button>
              <a class="btn" href="/users" style="text-decoration:none;">Cancel</a>
            </div>
          </form>
        </div>
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

  private static fieldError(
    fieldErrors: Record<string, string>,
    fieldName: string,
  ): string {
    const error = fieldErrors[fieldName];
    if (!error) {
      return '';
    }
    return `<span style="color:#fca5a5; font-size:12px;">${this.escapeHtml(error)}</span>`;
  }
}
