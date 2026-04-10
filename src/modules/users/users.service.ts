import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { hash } from 'bcrypt';
import { Model, Types } from 'mongoose';
import { RoleDocumentModel } from '../roles/role.schema';
import { UserDocumentModel } from './user.schema';
import type { UserRecord } from './user.types';
import { EmailAlreadyExistsError, RoleNotFoundError } from './users.errors';

export type UsersListFilters = {
  search?: string;
  role?: string;
};

export type UsersDashboardStats = {
  totalUsers: number;
  totalAdmins: number;
  totalNormalUsers: number;
  usersWithProfileImage: number;
  usersWithoutProfileImage: number;
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
  }>;
};

type CreateUserInput = {
  email: string;
  password: string;
  roleId: string;
  name?: string;
  phone?: string;
  profileImage?: string;
};

type UpdateUserInput = {
  email: string;
  roleId: string;
  name?: string;
  phone?: string;
  profileImage?: string;
  password?: string;
};

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(RoleDocumentModel.name)
    private readonly rolesModel: Model<RoleDocumentModel>,
    @InjectModel(UserDocumentModel.name)
    private readonly usersModel: Model<UserDocumentModel>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.migrateLegacyNumericIds();
    await this.seedDefaultSuperAdmin();
  }

  async findAll(filters?: UsersListFilters): Promise<UserRecord[]> {
    const search = filters?.search?.trim();
    const query: Record<string, unknown> = {};
    if (search && search.length > 0) {
      const searchRegex = new RegExp(this.escapeRegExp(search), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const users = await this.usersModel.find(query).sort({ _id: -1 }).lean().exec();
    const roleMap = await this.getRoleMap(users.map((user) => user.roleId));
    const roleFilter = filters?.role?.trim().toLowerCase();
    const hydrated = users.filter((user) => {
      const roleName = (
        roleMap.get(user.roleId ?? '__none__')?.name ?? ''
      )
        .trim()
        .toLowerCase();
      if (roleName === 'super admin') {
        return false;
      }
      if (roleFilter) {
        return roleName === roleFilter;
      }
      return true;
    });
    return hydrated.map((user) => ({
      ...user,
      id: user._id.toString(),
      name: user.name ?? null,
      phone: user.phone ?? null,
      profileImage: user.profileImage ?? null,
      roleId: user.roleId ?? null,
      refreshTokenHash: user.refreshTokenHash ?? null,
      roleMaster: roleMap.get(user.roleId ?? '__none__')
        ? { name: roleMap.get(user.roleId ?? '__none__')!.name }
        : null,
    }));
  }

  async getDashboardStats(): Promise<UsersDashboardStats> {
    const users = await this.usersModel.find({}).sort({ _id: -1 }).lean().exec();
    const roleMap = await this.getRoleMap(users.map((user) => user.roleId));
    const nonSuperAdminUsers = users.filter((user) => {
      const roleName = (
        roleMap.get(user.roleId ?? '__none__')?.name ?? ''
      )
        .trim()
        .toLowerCase();
      return roleName !== 'super admin';
    });
    const totalUsers = nonSuperAdminUsers.length;
    const totalAdmins = nonSuperAdminUsers.filter((user) => {
      const roleName = (
        roleMap.get(user.roleId ?? '__none__')?.name ?? ''
      )
        .trim()
        .toLowerCase();
      return roleName === 'administrator' || roleName === 'super admin';
    }).length;
    const usersWithProfileImage = nonSuperAdminUsers.filter(
      (user) => Boolean(user.profileImage && user.profileImage.trim()),
    ).length;
    const recentUsersRaw = nonSuperAdminUsers.slice(0, 5);
    const totalNormalUsers = Math.max(totalUsers - totalAdmins, 0);
    const usersWithoutProfileImage = Math.max(
      totalUsers - usersWithProfileImage,
      0,
    );

    return {
      totalUsers,
      totalAdmins,
      totalNormalUsers,
      usersWithProfileImage,
      usersWithoutProfileImage,
      recentUsers: recentUsersRaw.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: roleMap.get(user.roleId ?? '__none__')?.name ?? '-',
      })),
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const user = await this.usersModel.findOne({ _id: id }).lean().exec();
    if (!user) {
      return null;
    }
    return {
      ...user,
      id: user._id.toString(),
      name: user.name ?? null,
      phone: user.phone ?? null,
      profileImage: user.profileImage ?? null,
      roleId: user.roleId ?? null,
      refreshTokenHash: user.refreshTokenHash ?? null,
    };
  }

  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { email };
    if (typeof excludeUserId === 'string' && Types.ObjectId.isValid(excludeUserId)) {
      query._id = { $ne: new Types.ObjectId(excludeUserId) };
    }
    const count = await this.usersModel.countDocuments(query).exec();
    return count > 0;
  }

  async create(data: CreateUserInput): Promise<UserRecord> {
    const exists = await this.emailExists(data.email);
    if (exists) {
      throw new EmailAlreadyExistsError();
    }

    const role = await this.rolesModel
      .findOne({ _id: data.roleId, deletedAt: null }, { name: 1 })
      .lean()
      .exec();
    if (!role) {
      throw new RoleNotFoundError();
    }

    const passwordHash = await hash(data.password, 10);
    const created = await this.usersModel.create({
      email: data.email,
      password: passwordHash,
      roleId: role._id.toString(),
      name: data.name?.trim() || null,
      phone: data.phone?.trim() || null,
      profileImage: data.profileImage?.trim() || null,
    });
    return {
      id: created._id.toString(),
      email: created.email,
      password: created.password,
      name: created.name ?? null,
      phone: created.phone ?? null,
      profileImage: created.profileImage ?? null,
      roleId: created.roleId ?? null,
      refreshTokenHash: created.refreshTokenHash ?? null,
    };
  }

  async update(id: string, data: UpdateUserInput): Promise<void> {
    const exists = await this.emailExists(data.email, id);
    if (exists) {
      throw new EmailAlreadyExistsError();
    }

    const role = await this.rolesModel
      .findOne({ _id: data.roleId, deletedAt: null }, { _id: 1 })
      .lean()
      .exec();
    if (!role) {
      throw new RoleNotFoundError();
    }

    const updateData: Partial<UserDocumentModel> = {
      email: data.email,
      roleId: role._id.toString(),
      name: data.name?.trim() || null,
      phone: data.phone?.trim() || null,
    };

    if (typeof data.profileImage === 'string') {
      updateData.profileImage = data.profileImage.trim() || null;
    }

    if (data.password && data.password.trim()) {
      updateData.password = await hash(data.password, 10);
    }

    if (!Types.ObjectId.isValid(id)) {
      return;
    }
    await this.usersModel.updateOne({ _id: id }, { $set: updateData }).exec();
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      return;
    }
    await this.usersModel.deleteOne({ _id: id }).exec();
  }

  private async getRoleMap(
    roleIds: Array<string | null>,
  ): Promise<Map<string, { id: string; name: string }>> {
    const normalizedIds = [
      ...new Set(
        roleIds.filter(
          (id): id is string =>
            typeof id === 'string' && Types.ObjectId.isValid(id),
        ),
      ),
    ];
    if (normalizedIds.length === 0) {
      return new Map();
    }
    const roles = await this.rolesModel
      .find({ _id: { $in: normalizedIds }, deletedAt: null }, { name: 1 })
      .lean()
      .exec();
    const entries: Array<[string, { id: string; name: string }]> = [];
    for (const role of roles) {
      const id = role._id.toString();
      const name = role.name;
      if (typeof id === 'string' && typeof name === 'string') {
        entries.push([id, { id, name }]);
      }
    }
    return new Map(entries);
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async seedDefaultSuperAdmin(): Promise<void> {
    const defaultAdminEmail = 'admin@example.com';
    const defaultAdminPassword = '111111';

    const superAdminRole = await this.rolesModel
      .findOne(
        {
          deletedAt: null,
          name: { $regex: '^super\\s+admin$', $options: 'i' },
        },
        { name: 1, canAccessBackend: 1 },
      )
      .exec();

    let ensuredRole = superAdminRole;
    if (!ensuredRole) {
      ensuredRole = await this.rolesModel.create({
        name: 'super admin',
        description: 'Default super admin role',
        canAccessBackend: true,
        deletedAt: null,
      });
      this.logger.log('Seeded default "super admin" role');
    } else if (!ensuredRole.canAccessBackend) {
      ensuredRole.canAccessBackend = true;
      await ensuredRole.save();
    }

    const existingAdmin = await this.usersModel
      .findOne({ email: defaultAdminEmail }, { _id: 1, roleId: 1 })
      .lean()
      .exec();
    if (existingAdmin) {
      const hasValidRoleId =
        typeof existingAdmin.roleId === 'string' &&
        Types.ObjectId.isValid(existingAdmin.roleId);
      if (!hasValidRoleId) {
        await this.usersModel
          .updateOne(
            { _id: existingAdmin._id },
            { $set: { roleId: ensuredRole._id.toString() } },
          )
          .exec();
      }
      return;
    }

    const passwordHash = await hash(defaultAdminPassword, 10);
    await this.usersModel.create({
      email: defaultAdminEmail,
      password: passwordHash,
      roleId: ensuredRole._id.toString(),
      name: 'Super Admin',
      phone: null,
      profileImage: null,
      refreshTokenHash: null,
    });
    this.logger.log('Seeded default super admin user: admin@example.com');
  }

  private async migrateLegacyNumericIds(): Promise<void> {
    const legacyRoles = await this.rolesModel
      .find({ id: { $exists: true }, deletedAt: null }, { _id: 1, id: 1 })
      .lean()
      .exec();

    if (legacyRoles.length > 0) {
      const legacyRoleIdMap = new Map<number, string>();
      for (const role of legacyRoles) {
        const legacyId = (role as { id?: unknown }).id;
        if (typeof legacyId === 'number' && Number.isFinite(legacyId)) {
          legacyRoleIdMap.set(legacyId, role._id.toString());
        }
      }

      for (const [legacyRoleId, roleObjectId] of legacyRoleIdMap.entries()) {
        await this.usersModel
          .updateMany(
            { roleId: legacyRoleId as unknown as string },
            { $set: { roleId: roleObjectId } },
          )
          .exec();
      }
    }

    await this.usersModel
      .updateMany({ id: { $exists: true } }, { $unset: { id: '' } })
      .exec();
    await this.rolesModel
      .updateMany({ id: { $exists: true } }, { $unset: { id: '' } })
      .exec();
  }
}
