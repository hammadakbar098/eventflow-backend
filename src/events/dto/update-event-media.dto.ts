import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { EventMediaType } from '../../generated/prisma/client';

export class UpdateEventMediaDto {
  @IsOptional()
  @IsEnum(EventMediaType)
  type?: EventMediaType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
