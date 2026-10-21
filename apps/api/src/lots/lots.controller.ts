import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { PatchLotDto } from './dto/patch-lot.dto.js';
import { LotsService } from './lots.service.js';

@Controller('lots')
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get()
  findAll(@Query('propertyId') propertyId?: string) {
    return this.lotsService.findAll(propertyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lotsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: PatchLotDto) {
    return this.lotsService.update(id, dto);
  }
}
