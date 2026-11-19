import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import type { StoredSpace } from '../yard-store.js';

export class SaveYardDto {
  @IsString()
  name!: string;

  @IsIn(['square', 'radius', 'picture'])
  kind!: 'square' | 'radius' | 'picture';

  @IsNumber()
  length!: number;

  @IsNumber()
  width!: number;

  @IsNumber()
  radius!: number;

  @IsNumber()
  span!: number;

  @IsArray()
  outline!: number[][];

  @IsOptional()
  @IsObject()
  lease?: Record<string, string>;

  @IsOptional()
  @IsString()
  leaseName?: string;

  @IsOptional()
  @IsString()
  leaseFile?: string;

  @IsOptional()
  @IsArray()
  spaces?: StoredSpace[];
}
