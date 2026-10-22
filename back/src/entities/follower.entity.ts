import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Creator } from './creator.entity';
import { User } from './user.entity';

@Entity('followers')
export class Follower {
  @PrimaryColumn({ name: 'creator_id', type: 'uuid' })
  creatorId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
