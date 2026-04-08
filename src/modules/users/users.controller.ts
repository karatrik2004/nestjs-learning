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
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TrimBodyPipe } from '../../common/pipes/trim-body.pipe';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailAlreadyExistsError } from './users.errors';
import { UsersListFilters, UsersService } from './users.service';
import { UsersViews } from './users.views';

const PROFILE_UPLOAD_DIR = join(process.cwd(), 'uploads', 'profiles');
if (!existsSync(PROFILE_UPLOAD_DIR)) {
  mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(
    @Query('search') search: string | undefined,
    @Query('role') role: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const filters: UsersListFilters = { search, role };
    const users = await this.usersService.findAll(filters);
    res.status(200).send(UsersViews.list(users, filters));
  }

  @Get('new')
  newForm(@Res() res: Response): void {
    res.status(200).send(UsersViews.form('Create User', '/users/create'));
  }

  @Post('create')
  @UseInterceptors(
    FileInterceptor('profileImage', { dest: PROFILE_UPLOAD_DIR }),
  )
  async create(
    @Body(TrimBodyPipe) body: CreateUserDto,
    @Res() res: Response,
    @UploadedFile() profileImage: { filename: string } | undefined,
  ): Promise<void> {
    try {
      await this.usersService.create({
        name: body.name,
        email: body.email,
        phone: body.phone,
        profileImage: profileImage
          ? `/uploads/profiles/${profileImage.filename}`
          : undefined,
        role: body.role || 'user',
        password: body.password,
      });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        res.status(409).send(
          UsersViews.form('Create User', '/users/create', {
            name: body.name,
            email: body.email,
            phone: body.phone,
            role: body.role || 'user',
            errorMessage:
              'A user with this email already exists. Please use a different email.',
          }),
        );
        return;
      }
      throw error;
    }
    res.redirect(303, '/users');
  }

  @Get(':id/edit')
  async editForm(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const user = await this.usersService.findById(id);
    if (!user) {
      res.status(404).send('User not found');
      return;
    }

    res.status(200).send(
      UsersViews.form('Edit User', `/users/${id}/update`, {
        name: user.name ?? '',
        email: user.email,
        phone: user.phone ?? '',
        profileImage: user.profileImage ?? '',
        role: user.role,
      }),
    );
  }

  @Post(':id/update')
  @UseInterceptors(
    FileInterceptor('profileImage', { dest: PROFILE_UPLOAD_DIR }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(TrimBodyPipe) body: UpdateUserDto,
    @Res() res: Response,
    @UploadedFile() profileImage: { filename: string } | undefined,
  ): Promise<void> {
    try {
      await this.usersService.update(id, {
        name: body.name,
        email: body.email,
        phone: body.phone,
        profileImage: profileImage
          ? `/uploads/profiles/${profileImage.filename}`
          : undefined,
        role: body.role || 'user',
        password: body.password,
      });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        const user = await this.usersService.findById(id);
        res.status(409).send(
          UsersViews.form('Edit User', `/users/${id}/update`, {
            name: body.name,
            email: body.email,
            phone: body.phone,
            profileImage:
              profileImage !== undefined
                ? `/uploads/profiles/${profileImage.filename}`
                : (user?.profileImage ?? ''),
            role: body.role || 'user',
            errorMessage:
              'This email is already used by another user. Please choose a different email.',
          }),
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
}
