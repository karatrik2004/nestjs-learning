import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  BACKEND_ACCESS_POLICY,
  Roles,
} from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TrimBodyPipe } from '../../common/pipes/trim-body.pipe';
import { RolesService } from '../roles/roles.service';
import type { JwtPayload } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailAlreadyExistsError, RoleNotFoundError } from './users.errors';
import { UsersListFilters, UsersService } from './users.service';
import { UsersViews } from './users.views';

const PROFILE_UPLOAD_DIR = join(process.cwd(), 'uploads', 'profiles');
const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const PROFILE_IMAGE_FILE_TYPE = /^(image\/jpeg|image\/jpg|image\/png|image\/webp|image\/gif)$/;
type UploadedProfileImage = {
  filename: string;
  mimetype: string;
  size: number;
  path: string;
};
if (!existsSync(PROFILE_UPLOAD_DIR)) {
  mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(BACKEND_ACCESS_POLICY)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) { }

  @Get()
  async list(
    @CurrentUser() user: JwtPayload | null,
    @Query('search') search: string | undefined,
    @Query('role') role: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const filters: UsersListFilters = { search, role };
    const users = await this.usersService.findAll(filters);
    res
      .status(200)
      .send(UsersViews.list(users, filters, this.isSuperAdmin(user)));
  }

  @Get('new')
  async newForm(
    @CurrentUser() user: JwtPayload | null,
    @Res() res: Response,
  ): Promise<void> {
    const roleOptions = await this.getRoleOptions();
    res.status(200).send(
      UsersViews.form(
        'Create User',
        '/users/create',
        { roleOptions },
        this.isSuperAdmin(user),
      ),
    );
  }

  @Post('create')
  @UseInterceptors(
    FileInterceptor('profileImage', {
      dest: PROFILE_UPLOAD_DIR,
    }),
  )
  async create(
    @CurrentUser() user: JwtPayload | null,
    @Body(TrimBodyPipe) body: Record<string, unknown>,
    @Res() res: Response,
    @UploadedFile() profileImage: UploadedProfileImage | undefined,
  ): Promise<void> {
    const showRolesMenu = this.isSuperAdmin(user);
    const profileImageError = this.validateProfileImage(profileImage);
    if (profileImageError) {
      this.removeUploadedFile(profileImage);
      const roleOptions = await this.getRoleOptions();
      res.status(400).send(
        UsersViews.form(
          'Create User',
          '/users/create',
          {
            name: this.asString(body.name),
            email: this.asString(body.email),
            phone: this.asString(body.phone),
            roleId: this.asNumber(body.roleId),
            roleOptions,
            errorMessage: profileImageError,
          },
          showRolesMenu,
        ),
      );
      return;
    }

    const dto = this.toCreateUserDto(body);
    const fieldErrors = await this.validateDto(dto);
    if (Object.keys(fieldErrors).length > 0) {
      const roleOptions = await this.getRoleOptions();
      res.status(400).send(
        UsersViews.form('Create User', '/users/create', {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          roleId: dto.roleId,
          roleOptions,
          fieldErrors,
        }, showRolesMenu),
      );
      return;
    }

    try {
      await this.usersService.create({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        profileImage: profileImage
          ? `/uploads/profiles/${profileImage.filename}`
          : undefined,
        roleId: dto.roleId,
        password: dto.password,
      });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        const roleOptions = await this.getRoleOptions();
        res.status(409).send(
          UsersViews.form('Create User', '/users/create', {
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            roleId: dto.roleId,
            roleOptions,
            errorMessage:
              'A user with this email already exists. Please use a different email.',
          }, showRolesMenu),
        );
        return;
      }
      if (error instanceof RoleNotFoundError) {
        const roleOptions = await this.getRoleOptions();
        res.status(400).send(
          UsersViews.form('Create User', '/users/create', {
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            roleId: dto.roleId,
            roleOptions,
            errorMessage:
              'Selected role is invalid or deleted. Please choose a valid role.',
          }, showRolesMenu),
        );
        return;
      }
      throw error;
    }
    res.redirect(303, '/users');
  }

  @Get(':id/edit')
  async editForm(
    @CurrentUser() currentUser: JwtPayload | null,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const user = await this.usersService.findById(id);
    if (!user) {
      res.status(404).send('User not found');
      return;
    }

    const roleOptions = await this.getRoleOptions();
    res.status(200).send(
      UsersViews.form('Edit User', `/users/${id}/update`, {
        name: user.name ?? '',
        email: user.email,
        phone: user.phone ?? '',
        profileImage: user.profileImage ?? '',
        roleId: user.roleId ?? 0,
        roleOptions,
      }, this.isSuperAdmin(currentUser)),
    );
  }

  @Post(':id/update')
  @UseInterceptors(
    FileInterceptor('profileImage', {
      dest: PROFILE_UPLOAD_DIR,
    }),
  )
  async update(
    @CurrentUser() user: JwtPayload | null,
    @Param('id', ParseIntPipe) id: number,
    @Body(TrimBodyPipe) body: Record<string, unknown>,
    @Res() res: Response,
    @UploadedFile() profileImage: UploadedProfileImage | undefined,
  ): Promise<void> {
    const showRolesMenu = this.isSuperAdmin(user);
    const profileImageError = this.validateProfileImage(profileImage);
    if (profileImageError) {
      this.removeUploadedFile(profileImage);
      const existingUser = await this.usersService.findById(id);
      const roleOptions = await this.getRoleOptions();
      res.status(400).send(
        UsersViews.form(
          'Edit User',
          `/users/${id}/update`,
          {
            name: this.asString(body.name),
            email: this.asString(body.email),
            phone: this.asString(body.phone),
            profileImage: existingUser?.profileImage ?? '',
            roleId: this.asNumber(body.roleId),
            roleOptions,
            errorMessage: profileImageError,
          },
          showRolesMenu,
        ),
      );
      return;
    }

    const dto = this.toUpdateUserDto(body);
    const fieldErrors = await this.validateDto(dto);
    if (Object.keys(fieldErrors).length > 0) {
      const user = await this.usersService.findById(id);
      const roleOptions = await this.getRoleOptions();
      res.status(400).send(
        UsersViews.form('Edit User', `/users/${id}/update`, {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          profileImage:
            profileImage !== undefined
              ? `/uploads/profiles/${profileImage.filename}`
              : (user?.profileImage ?? ''),
          roleId: dto.roleId,
          roleOptions,
          fieldErrors,
        }, showRolesMenu),
      );
      return;
    }

    try {
      await this.usersService.update(id, {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        profileImage: profileImage
          ? `/uploads/profiles/${profileImage.filename}`
          : undefined,
        roleId: dto.roleId,
        password: dto.password,
      });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        const user = await this.usersService.findById(id);
        const roleOptions = await this.getRoleOptions();
        res.status(409).send(
          UsersViews.form('Edit User', `/users/${id}/update`, {
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            profileImage:
              profileImage !== undefined
                ? `/uploads/profiles/${profileImage.filename}`
                : (user?.profileImage ?? ''),
            roleId: dto.roleId,
            roleOptions,
            errorMessage:
              'This email is already used by another user. Please choose a different email.',
          }, showRolesMenu),
        );
        return;
      }
      if (error instanceof RoleNotFoundError) {
        const user = await this.usersService.findById(id);
        const roleOptions = await this.getRoleOptions();
        res.status(400).send(
          UsersViews.form('Edit User', `/users/${id}/update`, {
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            profileImage:
              profileImage !== undefined
                ? `/uploads/profiles/${profileImage.filename}`
                : (user?.profileImage ?? ''),
            roleId: dto.roleId,
            roleOptions,
            errorMessage:
              'Selected role is invalid or deleted. Please choose a valid role.',
          }, showRolesMenu),
        );
        return;
      }
      throw error;
    }
    res.redirect(303, '/users');
  }

  @Post(':id/delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    await this.usersService.delete(id);
    res.redirect(303, '/users');
  }

  // HTML rendering moved to UsersViews for cleaner controller flow.
  private toCreateUserDto(body: Record<string, unknown>): CreateUserDto {
    return plainToInstance(CreateUserDto, {
      name: this.asString(body.name),
      email: this.asString(body.email),
      phone: this.asString(body.phone),
      roleId: this.asNumber(body.roleId),
      password: this.asString(body.password),
    });
  }

  private toUpdateUserDto(body: Record<string, unknown>): UpdateUserDto {
    return plainToInstance(UpdateUserDto, {
      name: this.asString(body.name),
      email: this.asString(body.email),
      phone: this.asString(body.phone),
      roleId: this.asNumber(body.roleId),
      password: this.asString(body.password),
    });
  }

  private async validateDto(
    dto: CreateUserDto | UpdateUserDto,
  ): Promise<Record<string, string>> {
    const errors = await validate(dto);
    const fieldErrors: Record<string, string> = {};
    for (const error of errors) {
      const firstConstraint = error.constraints
        ? Object.values(error.constraints)[0]
        : undefined;
      if (firstConstraint) {
        fieldErrors[error.property] = firstConstraint;
      }
    }
    return fieldErrors;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private asNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private async getRoleOptions(): Promise<Array<{ id: number; name: string }>> {
    const roles = await this.rolesService.findAll();
    return roles
      .map((role) => ({ id: role.id, name: role.name?.trim() ?? '' }))
      .filter(
        (role) =>
          role.name !== '' && role.name.toLowerCase() !== 'super admin',
      );
  }

  private isSuperAdmin(user: JwtPayload | null): boolean {
    return (user?.role ?? '').trim().toLowerCase() === 'super admin';
  }

  private validateProfileImage(file: UploadedProfileImage | undefined): string | null {
    if (!file) {
      return null;
    }

    if (!PROFILE_IMAGE_FILE_TYPE.test(file.mimetype)) {
      return 'Invalid image type. Allowed: jpg, jpeg, png, webp, gif.';
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      return 'Profile image is too large. Maximum allowed size is 2MB.';
    }

    return null;
  }

  private removeUploadedFile(file: UploadedProfileImage | undefined): void {
    if (!file?.path) {
      return;
    }
    if (existsSync(file.path)) {
      unlinkSync(file.path);
    }
  }
}
