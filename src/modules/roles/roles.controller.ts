import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  BACKEND_ACCESS_POLICY,
  Roles,
} from '../../common/decorators/roles.decorator';
import { isSuperAdminUser } from '../../common/auth/role-utils';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtPayload } from '../auth/auth.service';
import { RoleAlreadyExistsError, RoleNotFoundError } from './roles.errors';
import { RolesService } from './roles.service';
import { RolesViews } from './roles.views';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(BACKEND_ACCESS_POLICY)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload | null,
    @Res() res: Response,
  ): Promise<void> {
    const showRolesMenu = isSuperAdminUser(user);
    const roles = (await this.rolesService.findAll()).filter(
      (role) => role.name.trim().toLowerCase() !== 'super admin',
    );
    res.status(200).send(RolesViews.list(roles, undefined, showRolesMenu));
  }

  @Post('create')
  @Roles('super admin')
  async create(
    @CurrentUser() user: JwtPayload | null,
    @Body() body: { name?: string; description?: string; canAccessBackend?: string },
    @Res() res: Response,
  ): Promise<void> {
    const showRolesMenu = isSuperAdminUser(user);
    const name = body.name?.trim() ?? '';
    if (!name) {
      const roles = (await this.rolesService.findAll()).filter(
        (role) => role.name.trim().toLowerCase() !== 'super admin',
      );
      res
        .status(400)
        .send(RolesViews.list(roles, 'Role name is required.', showRolesMenu));
      return;
    }

    const canAccessBackend = body.canAccessBackend === 'on';

    try {
      await this.rolesService.create(name, body.description, canAccessBackend);
    } catch (error) {
      if (error instanceof RoleAlreadyExistsError) {
        const roles = (await this.rolesService.findAll()).filter(
          (role) => role.name.trim().toLowerCase() !== 'super admin',
        );
        res
          .status(409)
          .send(
            RolesViews.list(
              roles,
              'Role already exists. Use a different role name.',
              showRolesMenu,
            ),
          );
        return;
      }
      throw error;
    }

    res.redirect(303, '/roles');
  }

  @Get(':id/edit')
  @Roles('super admin')
  async editForm(
    @CurrentUser() user: JwtPayload | null,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const role = await this.rolesService.findById(id);
    if (!role || role.name.trim().toLowerCase() === 'super admin') {
      res.status(404).send('Role not found');
      return;
    }
    res
      .status(200)
      .send(RolesViews.form(role, undefined, isSuperAdminUser(user)));
  }

  @Post(':id/update')
  @Roles('super admin')
  async update(
    @CurrentUser() user: JwtPayload | null,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string; canAccessBackend?: string },
    @Res() res: Response,
  ): Promise<void> {
    const showRolesMenu = isSuperAdminUser(user);
    const name = body.name?.trim() ?? '';
    const canAccessBackend = body.canAccessBackend === 'on';
    const existingRole = await this.rolesService.findById(id);
    if (!existingRole || existingRole.name.trim().toLowerCase() === 'super admin') {
      res.status(404).send('Role not found');
      return;
    }

    if (!name) {
      res
        .status(400)
        .send(RolesViews.form(existingRole, 'Role name is required.', showRolesMenu));
      return;
    }

    try {
      await this.rolesService.update(id, name, body.description, canAccessBackend);
    } catch (error) {
      if (error instanceof RoleAlreadyExistsError) {
        existingRole.name = name;
        existingRole.description = body.description?.trim() || null;
        existingRole.canAccessBackend = canAccessBackend;
        res
          .status(409)
          .send(
            RolesViews.form(
              existingRole,
              'Role already exists. Use a different role name.',
              showRolesMenu,
            ),
          );
        return;
      }
      if (error instanceof RoleNotFoundError) {
        res.status(404).send('Role not found');
        return;
      }
      throw error;
    }

    res.redirect(303, '/roles');
  }

  @Post(':id/delete')
  @Roles('super admin')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    await this.rolesService.delete(id);
    res.redirect(303, '/roles');
  }
}

