import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CreatorResponse, CreatorsService } from './creators.service';

@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get()
  findAll(): Promise<CreatorResponse[]> {
    return this.creatorsService.findAll();
  }

  @Get(':creatorId')
  findOne(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<CreatorResponse> {
    return this.creatorsService.findOne(creatorId);
  }
}
