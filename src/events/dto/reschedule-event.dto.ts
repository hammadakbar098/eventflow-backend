import { Transform } from 'class-transformer';
import { IsISO8601, IsNotEmpty, IsString, IsTimeZone } from 'class-validator';

export class RescheduleEventDto {
  @IsISO8601()
  startAt: string;

  @IsISO8601()
  endAt: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @IsTimeZone()
  timezone: string;
}
