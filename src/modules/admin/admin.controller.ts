import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminLayout } from '../../common/views/admin-layout';
import type { JwtPayload } from '../auth/auth.service';

@Controller('dashboard')
export class AdminController {
  @UseGuards(JwtAuthGuard)
  @Get()
  showDashboard(
    @CurrentUser() user: JwtPayload | null,
    @Res() res: Response,
  ): void {
    console.log('user', user);
    const userEmail = user?.email ?? 'admin@example.com';
    const userRole = user?.role ?? 'admin';
    res.status(200).send(
      AdminLayout.render({
        title: 'Admin Dashboard',
        pageTitle: 'Dashboard',
        userLabel: `Signed in as ${userEmail} (${userRole})`,
        navItems: [
          { label: 'Dashboard', href: '/dashboard', isActive: true },
          { label: 'Users', href: '/users' },
        ],
        contentHtml: `
          <h1 style="margin:0 0 8px; font-size:26px; color:#f8fafc;">Welcome back</h1>
          <p style="margin:0 0 16px; color:#94a3b8; font-size:14px;">Quick links and overview widgets for your admin panel.</p>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:14px; margin-top:8px;">
            <div style="padding:16px; border-radius:14px; background: rgba(30, 41, 59, 0.55); border: 1px solid rgba(148, 163, 184, 0.16);">
              <h3 style="margin:0 0 6px; font-size:14px; color:#7dd3fc;">Overview</h3>
              <p style="margin:0; font-size:13px; color:#94a3b8; line-height:1.35;">Summary widgets can go here.</p>
            </div>
            <div style="padding:16px; border-radius:14px; background: rgba(30, 41, 59, 0.55); border: 1px solid rgba(148, 163, 184, 0.16);">
              <h3 style="margin:0 0 6px; font-size:14px; color:#7dd3fc;">Users</h3>
              <p style="margin:0; font-size:13px; color:#94a3b8; line-height:1.35;">
                <a href="/users" style="color:#7dd3fc; text-decoration:none;">Manage users</a>, create/edit/delete, upload profile images.
              </p>
            </div>
            <div style="padding:16px; border-radius:14px; background: rgba(30, 41, 59, 0.55); border: 1px solid rgba(148, 163, 184, 0.16);">
              <h3 style="margin:0 0 6px; font-size:14px; color:#7dd3fc;">Settings</h3>
              <p style="margin:0; font-size:13px; color:#94a3b8; line-height:1.35;">App configuration placeholder.</p>
            </div>
          </div>
        `,
      }),
    );
  }
}
