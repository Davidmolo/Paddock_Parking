import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { LotStatus } from '../../data/seed.js';

export class PatchLotDto {
  @IsOptional()
  @IsIn([
    'available',
    'available_soon',
    'occupied',
    'reserved',
    'maintenance',
  ])
  status?: LotStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRate?: number;

  @IsOptional()
  @IsString()
  customerId?: string | null;

  @IsOptional()
  @IsString()
  qbItemName?: string;

  /** ISO date — when available_soon frees up */
  @IsOptional()
  @IsString()
  availableOn?: string | null;

  /** ISO date — when available space became vacant */
  @IsOptional()
  @IsString()
  vacantSince?: string | null;
}
