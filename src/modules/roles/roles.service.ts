import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { RoleAlreadyExistsError, RoleNotFoundError } from './roles.errors';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({ order: { id: 'DESC' } });
  }

  async create(
    name: string,
    description?: string,
    canAccessBackend = false,
  ): Promise<Role> {
    const normalizedName = name.trim();
    const exists = await this.rolesRepository
      .createQueryBuilder('role')
      .where('LOWER(role.name) = LOWER(:name)', { name: normalizedName })
      .getOne();

    if (exists) {
      throw new RoleAlreadyExistsError();
    }

    const role = this.rolesRepository.create({
      name: normalizedName,
      description: description?.trim() || null,
      canAccessBackend,
    });
    return this.rolesRepository.save(role);
  }

  async findById(id: number): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { id } });
  }

  async update(
    id: number,
    name: string,
    description?: string,
    canAccessBackend = false,
  ): Promise<void> {
    const role = await this.findById(id);
    if (!role) {
      throw new RoleNotFoundError();
    }

    const normalizedName = name.trim();
    const exists = await this.rolesRepository
      .createQueryBuilder('role')
      .where('LOWER(role.name) = LOWER(:name)', { name: normalizedName })
      .andWhere('role.id != :id', { id })
      .getOne();
    if (exists) {
      throw new RoleAlreadyExistsError();
    }

    role.name = normalizedName;
    role.description = description?.trim() || null;
    role.canAccessBackend = canAccessBackend;
    await this.rolesRepository.save(role);
  }

  async delete(id: number): Promise<void> {
    await this.rolesRepository.softDelete(id);
  }
}

