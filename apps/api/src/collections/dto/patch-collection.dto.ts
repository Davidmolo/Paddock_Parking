import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import type { CollectionAccount } from '../../data/seed.js';

export class PatchCollectionDto {
  @IsOptional()
  @IsIn([
    'need_email',
    'need_text',
    'owner_call',
    'promised',
    'dispute',
    'notice',
    'in_cure',
    'lockout',
  ])
  queue?: CollectionAccount['queue'];

  @IsOptional()
  @IsString()
  nextAction?: string;

  @IsOptional()
  @IsBoolean()
  logCall?: boolean;

  @IsOptional()
  @IsBoolean()
  logEmail?: boolean;
}
