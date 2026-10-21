import { Controller, Get, Query } from '@nestjs/common';
import type { Invoice } from '../data/seed.js';
import { InvoicesService } from './invoices.service.js';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: Invoice['status'],
  ) {
    return this.invoicesService.findAll(propertyId, status);
  }
}
