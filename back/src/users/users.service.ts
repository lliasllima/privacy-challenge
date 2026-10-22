import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

export interface UserResponse {
  id: string;
  name: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const user = this.usersRepository.create({ name: dto.name });
    const saved = await this.usersRepository.save(user);

    return { id: saved.id, name: saved.name };
  }
}
