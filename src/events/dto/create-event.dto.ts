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

class OnlineDetailsDto {
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

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(EventFormat)
  format: EventFormat;

  @IsUUID()
  categoryId: string;

  @IsISO8601()
  startAt: string;

  @IsISO8601()
  endAt: string;

  @IsString()
  @IsNotEmpty()
  @IsTimeZone()
  @MaxLength(100)
  timezone: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => OnlineDetailsDto)
  onlineDetails?: OnlineDetailsDto;
}
