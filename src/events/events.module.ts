import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventCategoriesController } from './event-categories.controller';
import { EventReferencesService } from './event-references.service';
import { TagsController } from './tags.controller';
import { VenuesController } from './venues.controller';

@Module({
  controllers: [
    EventsController,
    EventCategoriesController,
    TagsController,
    VenuesController,
  ],
  providers: [EventsService, EventReferencesService],
})
export class EventsModule {}
