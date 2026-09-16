import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMimeType,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { EventMediaType } from '../../generated/prisma/client';

export class CreateEventMediaDto {
  @IsEnum(EventMediaType)
  type: EventMediaType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  storageKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalName?: string;

  @IsMimeType()
  @Matches(/^image\/(avif|gif|jpeg|png|webp)$/i, {
    message: 'mimeType must be a supported image MIME type',
  })
  @MaxLength(100)
  mimeType: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  sizeBytes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20_000)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20_000)
  height?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;
}
