import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  BACKEND_ACCESS_POLICY,
  Roles,
} from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { buildAdminPageLocals } from '../../common/page/admin-page-locals';
import { TrimBodyPipe } from '../../common/pipes/trim-body.pipe';
import { isSuperAdminUser } from '../../common/auth/role-utils';
import type { JwtPayload } from '../auth/auth.service';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(BACKEND_ACCESS_POLICY)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async form(
    @CurrentUser() user: JwtPayload | null,
    @Res() res: Response,
  ): Promise<void> {
    const showRolesMenu = isSuperAdminUser(user);
    const settings = await this.settingsService.getSettings();
    res.status(200).render('settings/form', {
      ...buildAdminPageLocals({
        user,
        showRolesMenu,
        active: 'settings',
        title: 'Project Settings',
        pageTitle: 'Project Settings',
      }),
      ...settings,
      errorMessage: '',
      successMessage: '',
    });
  }

  @Post('save')
  async save(
    @CurrentUser() user: JwtPayload | null,
    @Body(TrimBodyPipe) body: Record<string, unknown>,
    @Res() res: Response,
  ): Promise<void> {
    const showRolesMenu = isSuperAdminUser(user);
    const projectName =
      typeof body.projectName === 'string' ? body.projectName.trim() : '';
    const supportEmail =
      typeof body.supportEmail === 'string' ? body.supportEmail.trim() : '';
    const maintenanceMode = body.maintenanceMode === 'on';
    const parsedPageSize =
      typeof body.defaultPageSize === 'string'
        ? Number(body.defaultPageSize)
        : Number.NaN;
    const defaultPageSize = Number.isFinite(parsedPageSize)
      ? parsedPageSize
      : 10;

    if (!projectName || !supportEmail || !supportEmail.includes('@')) {
      res.status(400).render('settings/form', {
        ...buildAdminPageLocals({
          user,
          showRolesMenu,
          active: 'settings',
          title: 'Project Settings',
          pageTitle: 'Project Settings',
        }),
        projectName,
        supportEmail,
        maintenanceMode,
        defaultPageSize,
        errorMessage:
          'Project name and valid support email are required fields.',
        successMessage: '',
      });
      return;
    }

    const normalizedPageSize = Math.min(Math.max(defaultPageSize, 1), 200);
    await this.settingsService.updateSettings({
      projectName,
      supportEmail,
      maintenanceMode,
      defaultPageSize: normalizedPageSize,
    });

    res.status(200).render('settings/form', {
      ...buildAdminPageLocals({
        user,
        showRolesMenu,
        active: 'settings',
        title: 'Project Settings',
        pageTitle: 'Project Settings',
      }),
      projectName,
      supportEmail,
      maintenanceMode,
      defaultPageSize: normalizedPageSize,
      errorMessage: '',
      successMessage: 'Settings saved successfully.',
    });
  }
}
