import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creator } from '../entities/creator.entity';
import { Follower } from '../entities/follower.entity';
import { User } from '../entities/user.entity';

export interface FollowResult {
  created: boolean;
}

export interface FollowerStatus {
  following: boolean;
}

export interface FollowerCount {
  creatorId: string;
  count: number;
}

@Injectable()
export class FollowersService {
  constructor(
    @InjectRepository(Follower)
    private readonly followersRepository: Repository<Follower>,
    @InjectRepository(Creator)
    private readonly creatorsRepository: Repository<Creator>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async follow(creatorId: string, userId: string): Promise<FollowResult> {
    await this.ensureCreatorExists(creatorId);
    await this.ensureUserExists(userId);

    // The composite primary key (creator_id, user_id) is the single source of
    // truth for idempotency: the conflict is resolved by the database, so
    // concurrent requests cannot create duplicates or race a SELECT+INSERT.
    const result = await this.followersRepository
      .createQueryBuilder()
      .insert()
      .into(Follower)
      .values({ creatorId, userId })
      .orIgnore()
      .returning('creator_id')
      .execute();

    return { created: Array.isArray(result.raw) && result.raw.length > 0 };
  }

  async unfollow(creatorId: string, userId: string): Promise<void> {
    await this.ensureCreatorExists(creatorId);
    await this.ensureUserExists(userId);

    await this.followersRepository.delete({ creatorId, userId });
  }

  async count(creatorId: string): Promise<FollowerCount> {
    await this.ensureCreatorExists(creatorId);

    const raw = await this.followersRepository
      .createQueryBuilder('follower')
      .select('COUNT(*)', 'count')
      .where('follower.creator_id = :creatorId', { creatorId })
      .getRawOne<{ count: string }>();

    return { creatorId, count: Number(raw?.count ?? 0) };
  }

  async status(creatorId: string, userId: string): Promise<FollowerStatus> {
    await this.ensureCreatorExists(creatorId);
    await this.ensureUserExists(userId);

    const following = await this.followersRepository.exists({
      where: { creatorId, userId },
    });

    return { following };
  }

  private async ensureCreatorExists(creatorId: string): Promise<void> {
    const exists = await this.creatorsRepository.exists({
      where: { id: creatorId },
    });

    if (!exists) {
      throw new NotFoundException(`Creator ${creatorId} not found`);
    }
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const exists = await this.usersRepository.exists({ where: { id: userId } });

    if (!exists) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }
}
