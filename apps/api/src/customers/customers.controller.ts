import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { UpsertCoiDto } from './dto/upsert-coi.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(
    @Query('propertyId') propertyId?: string,
    @Query('q') q?: string,
  ) {
    return this.customersService.findAll(propertyId, q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id/certificate')
  upsertCertificate(@Param('id') id: string, @Body() dto: UpsertCoiDto) {
    return this.customersService.upsertCertificate(id, dto);
  }

  @Post(':id/documents')
  uploadDocument(@Param('id') id: string, @Body() dto: UploadDocumentDto) {
    return this.customersService.uploadDocument(id, dto);
  }
}
