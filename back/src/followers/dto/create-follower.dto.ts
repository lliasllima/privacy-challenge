import { IsUUID } from 'class-validator';

export class CreateFollowerDto {
  @IsUUID()
  userId: string;
}
