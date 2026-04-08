import { Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { EmailAlreadyExistsError } from './users.errors';

export type UsersListFilters = {
  search?: string;
  role?: string;
};

type CreateUserInput = {
  email: string;
  password: string;
  role: string;
  name?: string;
  phone?: string;
  profileImage?: string;
};

type UpdateUserInput = {
  email: string;
  role: string;
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
  ) {}

  async findAll(filters?: UsersListFilters): Promise<User[]> {
    const query = this.usersRepository
      .createQueryBuilder('user')
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
      query.andWhere('user.role = :role', { role });
    }

    return query.getMany();
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
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

    const passwordHash = await hash(data.password, 10);
    const user = this.usersRepository.create({
      email: data.email,
      password: passwordHash,
      role: data.role,
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

    const updateData: Partial<User> = {
      email: data.email,
      role: data.role,
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
