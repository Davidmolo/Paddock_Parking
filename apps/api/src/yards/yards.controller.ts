import { BadRequestException, Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import { SaveYardDto } from './dto/save-yard.dto.js';
import { isPaddockEditor, paintPaddockYard } from './paddock-layout.js';
import { archiveSpace, archiveYard, writeYard } from './yard-store.js';

@Controller('yards')
export class YardsController {
  constructor(private readonly store: DataStoreService) {}

  @Get()
  list() {
    return this.store.yards
      .filter((yard) => !yard.archived)
      .map((yard) => paintPaddockYard(yard, this.store.lots, this.store.customers));
  }

  @Put(':id')
  save(@Param('id') id: string, @Body() dto: SaveYardDto) {
    if (!id.startsWith('yard-') && !isPaddockEditor(id)) throw new BadRequestException('Yard id is not valid');
    writeYard(this.store, { ...dto, id, spaces: dto.spaces ?? [] });
    return this.store.yards.find((yard) => yard.id === id);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    if (!id.startsWith('yard-')) throw new BadRequestException('Yard id is not valid');
    archiveYard(this.store, id);
    return { ok: true, archived: true };
  }

  @Post(':yardId/spaces/:spaceId/archive')
  archiveSpace(@Param('yardId') yardId: string, @Param('spaceId') spaceId: string) {
    if (!yardId.startsWith('yard-') && !isPaddockEditor(yardId)) {
      throw new BadRequestException('Yard id is not valid');
    }
    archiveSpace(this.store, yardId, spaceId);
    return { ok: true, archived: true };
  }
}
