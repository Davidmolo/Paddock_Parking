import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { BookingCondition, LotType } from '../data/seed.js';
import { BookingsService } from './bookings.service.js';

class BookingVehicleDto {
  @IsString()
  make!: string;

  @IsString()
  color!: string;

  @IsString()
  truckNumber!: string;

  @IsString()
  licensePlate!: string;

  @IsBoolean()
  submitLater!: boolean;
}

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

  @IsOptional()
  @IsIn(['parking_spot', 'storage_acre'])
  productType?: 'parking_spot' | 'storage_acre';

  @IsOptional()
  @IsNumber()
  @Min(1)
  spotCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  acreSize?: number;

  @IsOptional()
  @IsString()
  storageDescription?: string;

  @IsOptional()
  @IsString()
  leaseStart?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingVehicleDto)
  vehicles?: BookingVehicleDto[];

  @IsOptional()
  @IsBoolean()
  docsSubmitLater?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  wizardStep?: 1 | 2 | 3 | 4 | 5;

  @IsOptional()
  @IsIn(['card', 'ach', 'pending'])
  paymentMethod?: 'card' | 'ach' | 'pending';

  @IsOptional()
  @IsBoolean()
  autoPullAgreed?: boolean;

  @IsOptional()
  @IsString()
  lotId?: string;

  @IsOptional()
  @IsString()
  referredBy?: string;

  @IsOptional()
  @IsString()
  lesseeName?: string;

  @IsOptional()
  @IsString()
  lesseeSignature?: string;

  @IsOptional()
  @IsString()
  guarantorName?: string;

  @IsOptional()
  @IsString()
  guarantorSignature?: string;

  @IsOptional()
  @IsString()
  signatureDate?: string;
}

class ConvertBookingDto {
  @IsString()
  lotId!: string;
}

class PatchBookingDto {
  @IsOptional()
  @IsBoolean()
  autoPullWaived?: boolean;

  @IsOptional()
  @IsIn(['card', 'ach'])
  paymentMethod?: 'card' | 'ach';
}

class DecideBookingDto {
  @IsIn(['approve', 'conditional', 'deny'])
  decision!: 'approve' | 'conditional' | 'deny';

  @IsOptional()
  @IsString()
  lotId?: string;

  @IsOptional()
  @IsArray()
  @IsIn(['escrow', 'bond', 'prepaid', 'coi_pending', 'deposit_hold'], {
    each: true,
  })
  conditions?: BookingCondition[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  giveGateCode?: boolean;
}

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@Query('propertyId') propertyId?: string) {
    return this.bookingsService.findAll(propertyId);
  }

  /** Compliance: plates / docs marked submit-later */
  @Get('compliance-queue')
  complianceQueue() {
    return this.bookingsService.complianceQueue();
  }

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: PatchBookingDto) {
    return this.bookingsService.patch(id, dto);
  }

  /** FMS: Approve / Conditionally approve / Deny (once) */
  @Post(':id/decide')
  decide(@Param('id') id: string, @Body() dto: DecideBookingDto) {
    return this.bookingsService.decide(id, dto);
  }

  /** FMS: portal invite after approval */
  @Post(':id/invite-portal')
  invitePortal(@Param('id') id: string) {
    return this.bookingsService.invitePortal(id);
  }

  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() dto: ConvertBookingDto) {
    return this.bookingsService.convert(id, dto.lotId);
  }
}
