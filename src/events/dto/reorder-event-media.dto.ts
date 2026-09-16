import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class EventMediaOrderItemDto {
  @IsUUID()
  mediaId: string;

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderEventMediaDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((item: EventMediaOrderItemDto) => item.mediaId)
  @ArrayUnique((item: EventMediaOrderItemDto) => item.sortOrder)
  @ValidateNested({ each: true })
  @Type(() => EventMediaOrderItemDto)
  items: EventMediaOrderItemDto[];
}
