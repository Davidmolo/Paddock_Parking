import { IsIn, IsString, MinLength } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @MinLength(1)
  fileName!: string;

  @IsIn(['lease', 'insurance', 'other'])
  kind!: 'lease' | 'insurance' | 'other';

  /** Base64 payload (optionally data-URL prefixed) */
  @IsString()
  @MinLength(1)
  contentBase64!: string;
}
