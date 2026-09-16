import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueQueryDto } from './dto/venue-query.dto';
import { EventReferencesService } from './event-references.service';

@Controller('venues')
export class VenuesController {
  constructor(private readonly references: EventReferencesService) {}

  @Get()
  findAll(@Query() query: VenueQueryDto) {
    return this.references.findVenues(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateVenueDto) {
    return this.references.createVenue(dto);
  }

  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.references.findVenueById(id);
  }
}
