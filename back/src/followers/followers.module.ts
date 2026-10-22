import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Creator } from '../entities/creator.entity';
import { Follower } from '../entities/follower.entity';
import { User } from '../entities/user.entity';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Follower, Creator, User])],
  controllers: [FollowersController],
  providers: [FollowersService],
})
export class FollowersModule {}
