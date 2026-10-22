import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creator } from '../entities/creator.entity';

export interface CreatorResponse {
  id: string;
  name: string;
}

@Injectable()
export class CreatorsService {
  constructor(
    @InjectRepository(Creator)
    private readonly creatorsRepository: Repository<Creator>,
  ) {}

  async findAll(): Promise<CreatorResponse[]> {
    const creators = await this.creatorsRepository.find({
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });

    return creators.map(({ id, name }) => ({ id, name }));
  }

  async findOne(creatorId: string): Promise<CreatorResponse> {
    const creator = await this.creatorsRepository.findOne({
      where: { id: creatorId },
      select: { id: true, name: true },
    });

    if (!creator) {
      throw new NotFoundException(`Creator ${creatorId} not found`);
    }

    return { id: creator.id, name: creator.name };
  }
}
