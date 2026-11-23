import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsBoolean, IsIn, IsNumber, IsOptional } from 'class-validator';
import { CustomersService } from './customers.service.js';
import { UpsertCoiDto } from './dto/upsert-coi.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';

class PatchBillingDto {
  @IsOptional()
  @IsBoolean()
  autoPull?: boolean;

  @IsOptional()
  @IsIn(['card', 'ach'])
  payMethod?: 'card' | 'ach';
}

class PatchUtilitiesDto {
  @IsOptional()
  @IsBoolean()
  usesElectricity?: boolean;

  @IsOptional()
  @IsBoolean()
  usesWater?: boolean;

  @IsOptional()
  @IsNumber()
  utilityRate?: number;
}

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

  @Patch(':id/billing')
  setBilling(@Param('id') id: string, @Body() dto: PatchBillingDto) {
    return this.customersService.setBilling(id, dto);
  }

  @Patch(':id/utilities')
  setUtilities(
    @Param('id') id: string,
    @Body() body: PatchUtilitiesDto,
  ) {
    return this.customersService.setUtilities(id, body);
  }

  @Post(':id/send-invoices')
  sendInvoices(@Param('id') id: string) {
    return this.customersService.sendInvoices(id);
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
