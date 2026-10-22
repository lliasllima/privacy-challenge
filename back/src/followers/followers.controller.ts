import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateFollowerDto } from './dto/create-follower.dto';
import {
  FollowerCount,
  FollowersService,
  FollowerStatus,
} from './followers.service';

export interface FollowResponse {
  creatorId: string;
  userId: string;
  following: true;
}

@Controller('creators/:creatorId/followers')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Post()
  async follow(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Body() dto: CreateFollowerDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<FollowResponse> {
    const { created } = await this.followersService.follow(
      creatorId,
      dto.userId,
    );

    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);

    return { creatorId, userId: dto.userId, following: true };
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.followersService.unfollow(creatorId, userId);
  }

  // Declared before ":userId" so that Express matches the literal route first.
  @Get('count')
  count(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<FollowerCount> {
    return this.followersService.count(creatorId);
  }

  @Get(':userId')
  status(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<FollowerStatus> {
    return this.followersService.status(creatorId, userId);
  }
}
