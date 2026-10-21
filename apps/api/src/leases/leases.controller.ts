import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import type { LeaseDirection } from '../data/seed.js';
import { PatchLeaseDto } from './dto/patch-lease.dto.js';
import { LeasesService } from './leases.service.js';

@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Get()
  findAll(
    @Query('propertyId') propertyId?: string,
    @Query('direction') direction?: LeaseDirection,
  ) {
    return this.leasesService.findAll(propertyId, direction);
  }

  @Get('renewals-due')
  renewalsDue(@Query('propertyId') propertyId?: string) {
    return this.leasesService.findRenewalsDue(propertyId);
  }

  @Get('summary')
  summary(@Query('propertyId') propertyId?: string) {
    return this.leasesService.summary(propertyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leasesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: PatchLeaseDto) {
    return this.leasesService.update(id, dto);
  }
}
