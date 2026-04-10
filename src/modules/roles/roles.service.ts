import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Model } from 'mongoose';
import { RoleAlreadyExistsError, RoleNotFoundError } from './roles.errors';
import { RoleDocumentModel } from './role.schema';
import type { RoleRecord } from './role.types';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(RoleDocumentModel.name)
    private readonly rolesModel: Model<RoleDocumentModel>,
  ) {}

  async findAll(): Promise<RoleRecord[]> {
    const rows = await this.rolesModel
      .find({ deletedAt: null })
      .sort({ _id: -1 })
      .lean()
      .exec();
    return rows.map((row) => ({
      _id: row._id.toString(),
      name: row.name,
      description: row.description ?? null,
      canAccessBackend: Boolean(row.canAccessBackend),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
    }));
  }

  async create(
    name: string,
    description?: string,
    canAccessBackend = false,
  ): Promise<RoleRecord> {
    const normalizedName = name.trim();
    const exists = await this.rolesModel
      .findOne({
        deletedAt: null,
        name: { $regex: `^${this.escapeRegExp(normalizedName)}$`, $options: 'i' },
      })
      .lean()
      .exec();

    if (exists) {
      throw new RoleAlreadyExistsError();
    }

    const role = await this.rolesModel.create({
      name: normalizedName,
      description: description?.trim() || null,
      canAccessBackend,
      deletedAt: null,
    });
    return {
      _id: role._id.toString(),
      name: role.name,
      description: role.description ?? null,
      canAccessBackend: Boolean(role.canAccessBackend),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      deletedAt: role.deletedAt ?? null,
    };
  }

  async findById(id: string): Promise<RoleRecord | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const row = await this.rolesModel
      .findOne({ _id: id, deletedAt: null })
      .lean()
      .exec();
    if (!row) {
      return null;
    }
    return {
      _id: row._id.toString(),
      name: row.name,
      description: row.description ?? null,
      canAccessBackend: Boolean(row.canAccessBackend),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
    };
  }

  async update(
    id: string,
    name: string,
    description?: string,
    canAccessBackend = false,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new RoleNotFoundError();
    }
    const role = await this.rolesModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!role) {
      throw new RoleNotFoundError();
    }

    const normalizedName = name.trim();
    const exists = await this.rolesModel
      .findOne({
        deletedAt: null,
        _id: { $ne: id },
        name: { $regex: `^${this.escapeRegExp(normalizedName)}$`, $options: 'i' },
      })
      .lean()
      .exec();
    if (exists) {
      throw new RoleAlreadyExistsError();
    }

    role.name = normalizedName;
    role.description = description?.trim() || null;
    role.canAccessBackend = canAccessBackend;
    await role.save();
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      return;
    }
    await this.rolesModel
      .updateOne({ _id: id, deletedAt: null }, { $set: { deletedAt: new Date() } })
      .exec();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

