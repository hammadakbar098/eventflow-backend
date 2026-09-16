import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { EventFormat } from '../../generated/prisma/client';

class UpdateOnlineDetailsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  platform: string;

  @IsUrl()
  @MaxLength(2048)
  accessUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accessCode?: string;

  @IsOptional()
  @IsString()
  accessInstructions?: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(EventFormat)
  format?: EventFormat;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsTimeZone()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsUUID()
  venueId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOnlineDetailsDto)
  onlineDetails?: UpdateOnlineDetailsDto | null;
}
