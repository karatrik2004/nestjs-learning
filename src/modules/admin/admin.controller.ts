import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  BACKEND_ACCESS_POLICY,
  Roles,
} from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminLayout } from '../../common/views/admin-layout';
import type { JwtPayload } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(BACKEND_ACCESS_POLICY)
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async showDashboard(
    @CurrentUser() user: JwtPayload | null,
    @Res() res: Response,
  ): Promise<void> {
    const userEmail = user?.email ?? 'admin@example.com';
    const userRole = user?.role ?? 'admin';
    const showRolesMenu = userRole.trim().toLowerCase() === 'super admin';
    const stats = await this.usersService.getDashboardStats();
    const recentUsersRows = stats.recentUsers
      .map(
        (u) => `
          <tr>
            <td style="padding:8px 10px; border-bottom:1px solid rgba(148,163,184,0.14);">${u.id}</td>
            <td style="padding:8px 10px; border-bottom:1px solid rgba(148,163,184,0.14);">${this.escapeHtml(u.name ?? '-')}</td>
            <td style="padding:8px 10px; border-bottom:1px solid rgba(148,163,184,0.14);">${this.escapeHtml(u.email)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid rgba(148,163,184,0.14);">${this.escapeHtml(u.role)}</td>
          </tr>
        `,
      )
      .join('');
    res.status(200).send(
      AdminLayout.render({
        title: 'Admin Dashboard',
        pageTitle: 'Dashboard',
        userLabel: `Signed in as ${userEmail} (${userRole})`,
        navItems: [
          { label: 'Dashboard', href: '/dashboard', isActive: true },
          { label: 'Users', href: '/users' },
          { label: 'FAQ', href: '/faqs' },
          ...(showRolesMenu ? [{ label: 'Roles', href: '/roles' }] : []),
        ],
        contentHtml: `
          <h1 style="margin:0 0 8px; font-size:26px; color:#f8fafc;">Welcome back</h1>
          <p style="margin:0 0 18px; color:#94a3b8; font-size:14px;">You are signed in successfully. Here's current users snapshot.</p>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:12px;">
            <a href="/users" style="padding:14px; border-radius:12px; border:1px solid rgba(148,163,184,0.18); background: rgba(2,6,23,0.20); text-decoration:none; display:block;">
              <div style="font-size:12px; color:#94a3b8;">Total Users</div>
              <div style="font-size:24px; font-weight:700; color:#f8fafc;">${stats.totalUsers}</div>
            </a>
            <div style="padding:14px; border-radius:12px; border:1px solid rgba(148,163,184,0.18); background: rgba(2,6,23,0.20);">
              <div style="font-size:12px; color:#94a3b8;">Admins</div>
              <div style="font-size:24px; font-weight:700; color:#f8fafc;">${stats.totalAdmins}</div>
            </div>
            <div style="padding:14px; border-radius:12px; border:1px solid rgba(148,163,184,0.18); background: rgba(2,6,23,0.20);">
              <div style="font-size:12px; color:#94a3b8;">Normal Users</div>
              <div style="font-size:24px; font-weight:700; color:#f8fafc;">${stats.totalNormalUsers}</div>
            </div>
            <div style="padding:14px; border-radius:12px; border:1px solid rgba(148,163,184,0.18); background: rgba(2,6,23,0.20);">
              <div style="font-size:12px; color:#94a3b8;">With Image</div>
              <div style="font-size:24px; font-weight:700; color:#f8fafc;">${stats.usersWithProfileImage}</div>
            </div>
          </div>
          <div style="margin-top:16px; border:1px solid rgba(148,163,184,0.18); border-radius:12px; overflow:auto;">
            <div style="padding:10px 12px; font-size:13px; color:#cbd5e1; border-bottom:1px solid rgba(148,163,184,0.14); display:flex; justify-content:space-between; align-items:center;">
              <span>Recent Users (last 5)</span>
              <a href="/users" style="color:#7dd3fc; text-decoration:none; font-size:12px;">See all</a>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <thead>
                <tr style="text-align:left; color:#94a3b8;">
                  <th style="padding:8px 10px;">ID</th>
                  <th style="padding:8px 10px;">Name</th>
                  <th style="padding:8px 10px;">Email</th>
                  <th style="padding:8px 10px;">Role</th>
                </tr>
              </thead>
              <tbody>
                ${recentUsersRows || `<tr><td colspan="4" style="padding:10px; color:#94a3b8;">No users found.</td></tr>`}
              </tbody>
            </table>
          </div>
        `,
      }),
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
