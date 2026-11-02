import { Controller, Get, Query } from '@nestjs/common';
import type {
  Invoice,
  InvoiceCollectionMethod,
} from '../data/seed.js';
import { InvoicesService } from './invoices.service.js';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: Invoice['status'],
    @Query('collectionMethod') collectionMethod?: InvoiceCollectionMethod,
  ) {
    return this.invoicesService.findAll(
      propertyId,
      status,
      collectionMethod,
    );
  }
}
