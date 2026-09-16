import { Controller, Get, Query } from '@nestjs/common';

import { TagQueryDto } from './dto/tag-query.dto';
import { EventReferencesService } from './event-references.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly references: EventReferencesService) {}

  @Get()
  findAll(@Query() query: TagQueryDto) {
    return this.references.findActiveTags(query);
  }
}
