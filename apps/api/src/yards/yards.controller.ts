import { BadRequestException, Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import { SaveYardDto } from './dto/save-yard.dto.js';
import { removeYard, writeYard } from './yard-store.js';

@Controller('yards')
export class YardsController {
  constructor(private readonly store: DataStoreService) {}

  @Get()
  list() {
    return this.store.yards;
  }

  @Put(':id')
  save(@Param('id') id: string, @Body() dto: SaveYardDto) {
    if (!id.startsWith('yard-')) throw new BadRequestException('Yard id is not valid');
    writeYard(this.store, { ...dto, id, spaces: dto.spaces ?? [] });
    return this.store.yards.find((yard) => yard.id === id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    if (!id.startsWith('yard-')) throw new BadRequestException('Yard id is not valid');
    removeYard(this.store, id);
    return { ok: true };
  }
}
