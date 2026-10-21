import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { Lease } from '../../data/seed.js';

export class PatchLeaseDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  renewalDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  notificationLeadDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  termMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRent?: number;

  @IsOptional()
  @IsIn(['active', 'pending', 'expired', 'terminated'])
  status?: Lease['status'];

  @IsOptional()
  @IsString()
  landlordName?: string;

  @IsOptional()
  @IsString()
  landlordContact?: string;

  @IsOptional()
  @IsString()
  landlordEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
