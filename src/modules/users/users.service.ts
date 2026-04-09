import { Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '../roles/role.entity';
import { User } from './user.entity';
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
    id: number;
    name: string | null;
    email: string;
    role: string;
  }>;
};

type CreateUserInput = {
  email: string;
  password: string;
  roleId: number;
  name?: string;
  phone?: string;
  profileImage?: string;
};

type UpdateUserInput = {
  email: string;
  roleId: number;
  name?: string;
  phone?: string;
  profileImage?: string;
  password?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async findAll(filters?: UsersListFilters): Promise<User[]> {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roleMaster', 'roleMaster')
      .where(
        "(roleMaster.name IS NULL OR LOWER(TRIM(roleMaster.name)) <> 'super admin')",
      )
      .orderBy('user.id', 'DESC');

    const search = filters?.search?.trim();
    if (search) {
      query.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const role = filters?.role?.trim();
    if (role) {
      query.andWhere('LOWER(roleMaster.name) = LOWER(:role)', { role });
    }

    return query.getMany();
  }

  async getDashboardStats(): Promise<UsersDashboardStats> {
    const nonSuperAdminCondition =
      "(roleMaster.name IS NULL OR LOWER(TRIM(roleMaster.name)) <> 'super admin')";

    const [totalUsers, totalAdmins, usersWithProfileImage, recentUsersRaw] =
      await Promise.all([
        this.usersRepository
          .createQueryBuilder('user')
          .leftJoin('user.roleMaster', 'roleMaster')
          .where(nonSuperAdminCondition)
          .getCount(),
        this.usersRepository
          .createQueryBuilder('user')
          .leftJoin('user.roleMaster', 'roleMaster')
          .where(nonSuperAdminCondition)
          .andWhere(
            'LOWER(roleMaster.name) IN (:...adminRoleNames)',
            { adminRoleNames: ['administrator', 'super admin'] },
          )
          .getCount(),
        this.usersRepository
          .createQueryBuilder('user')
          .leftJoin('user.roleMaster', 'roleMaster')
          .where(nonSuperAdminCondition)
          .andWhere('user.profileImage IS NOT NULL')
          .andWhere("TRIM(user.profileImage) <> ''")
          .getCount(),
        this.usersRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.roleMaster', 'roleMaster')
          .where(nonSuperAdminCondition)
          .orderBy('user.id', 'DESC')
          .take(5)
          .getMany(),
      ]);

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
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.roleMaster?.name ?? '-',
      })),
    };
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: { roleMaster: true },
    });
  }

  async emailExists(email: string, excludeUserId?: number): Promise<boolean> {
    if (excludeUserId) {
      const count = await this.usersRepository.count({
        where: { email, id: Not(excludeUserId) },
      });
      return count > 0;
    }
    const count = await this.usersRepository.count({ where: { email } });
    return count > 0;
  }

  async create(data: CreateUserInput): Promise<User> {
    const exists = await this.emailExists(data.email);
    if (exists) {
      throw new EmailAlreadyExistsError();
    }

    const role = await this.rolesRepository.findOne({
      where: { id: data.roleId },
    });
    if (!role) {
      throw new RoleNotFoundError();
    }

    const passwordHash = await hash(data.password, 10);
    const user = this.usersRepository.create({
      email: data.email,
      password: passwordHash,
      roleId: role.id,
      name: data.name?.trim() || null,
      phone: data.phone?.trim() || null,
      profileImage: data.profileImage?.trim() || null,
    });
    return this.usersRepository.save(user);
  }

  async update(id: number, data: UpdateUserInput): Promise<void> {
    const exists = await this.emailExists(data.email, id);
    if (exists) {
      throw new EmailAlreadyExistsError();
    }

    const role = await this.rolesRepository.findOne({
      where: { id: data.roleId },
    });
    if (!role) {
      throw new RoleNotFoundError();
    }

    const updateData: Partial<User> = {
      email: data.email,
      roleId: role.id,
      name: data.name?.trim() || null,
      phone: data.phone?.trim() || null,
    };

    if (typeof data.profileImage === 'string') {
      updateData.profileImage = data.profileImage.trim() || null;
    }

    if (data.password && data.password.trim()) {
      updateData.password = await hash(data.password, 10);
    }

    await this.usersRepository.update(id, updateData);
  }

  async delete(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
