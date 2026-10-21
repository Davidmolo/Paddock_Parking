import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { LotStatus } from '../../data/seed.js';

export class PatchLotDto {
  @IsOptional()
  @IsIn(['available', 'occupied', 'reserved', 'maintenance'])
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
}
