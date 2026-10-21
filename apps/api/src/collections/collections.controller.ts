import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { CollectionAccount } from '../data/seed.js';
import { CollectionsService } from './collections.service.js';
import { PatchCollectionDto } from './dto/patch-collection.dto.js';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  findAll(
    @Query('propertyId') propertyId?: string,
    @Query('queue') queue?: CollectionAccount['queue'],
  ) {
    return this.collectionsService.findAll(propertyId, queue);
  }

  @Post('send-emails-due')
  sendEmailsDue(@Query('propertyId') propertyId?: string) {
    return this.collectionsService.sendEmailsDue(propertyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: PatchCollectionDto) {
    return this.collectionsService.update(id, dto);
  }
}
