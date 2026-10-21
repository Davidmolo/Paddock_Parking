import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertCoiDto {
  @IsString()
  @MinLength(1)
  carrier!: string;

  @IsString()
  @MinLength(1)
  policyNumber!: string;

  @IsString()
  effectiveDate!: string;

  @IsString()
  expirationDate!: string;

  @IsString()
  @MinLength(1)
  additionalInsuredName!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  documentId?: string;
}
