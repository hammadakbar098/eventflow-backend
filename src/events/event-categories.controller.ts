import { Controller, Get } from '@nestjs/common';

import { EventReferencesService } from './event-references.service';

@Controller('event-categories')
export class EventCategoriesController {
  constructor(private readonly references: EventReferencesService) {}

  @Get()
  findAll() {
    return this.references.findActiveCategories();
  }
}
