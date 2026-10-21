import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsEmail, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { LotType } from '../data/seed.js';
import { BookingsService } from './bookings.service.js';

class CreateBookingDto {
  @IsString()
  propertyId!: string;

  @IsIn(['truck_trailer', 'general_storage', 'bobtail', 'drop_yard', 'acre'])
  lotType!: LotType;

  @IsString()
  customerName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ConvertBookingDto {
  @IsString()
  lotId!: string;
}

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@Query('propertyId') propertyId?: string) {
    return this.bookingsService.findAll(propertyId);
  }

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() dto: ConvertBookingDto) {
    return this.bookingsService.convert(id, dto.lotId);
  }
}
