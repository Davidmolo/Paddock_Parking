import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { DataStoreService, type Vendor } from '../data/data-store.service.js';

class SaveVendorDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  trade!: string;

  @IsString()
  phone!: string;

  @IsString()
  @MinLength(1)
  propertyId!: string;

  @IsString()
  @MinLength(1)
  job!: string;
}

@Controller('vendors')
export class VendorsController {
  constructor(private readonly store: DataStoreService) {}

  @Get()
  list(@Query('propertyId') propertyId?: string) {
    const rows = this.store.vendors;
    if (!propertyId || propertyId === 'all') return rows;
    return rows.filter((vendor) => vendor.propertyId === propertyId);
  }

  @Post()
  add(@Body() dto: SaveVendorDto): Vendor {
    const vendor: Vendor = { ...dto, id: `vendor-${Date.now()}` };
    this.store.vendors.unshift(vendor);
    return vendor;
  }
}
