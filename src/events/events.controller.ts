import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';
import { EventQueryDto } from './dto/event-query.dto';
import { MyEventsQueryDto } from './dto/my-events-query.dto';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateEventDto } from './dto/update-event.dto';
import { CancelEventDto } from './dto/cancel-event.dto';
import { CreateEventMediaDto } from './dto/create-event-media.dto';
import { PostponeEventDto } from './dto/postpone-event.dto';
import { ReorderEventMediaDto } from './dto/reorder-event-media.dto';
import { RescheduleEventDto } from './dto/reschedule-event.dto';
import { UpdateEventMediaDto } from './dto/update-event-media.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.create(dto, user);
  }

  @Get()
  findPublicUpcoming(@Query() query: EventQueryDto) {
    return this.eventsService.findPublicUpcoming(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyEventsQueryDto,
  ) {
    return this.eventsService.findMine(user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/:slug')
  findMineBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.findMineBySlug(slug, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/:slug')
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.update(slug, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('mine/:slug')
  remove(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.remove(slug, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/:slug/publish')
  publish(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.publish(slug, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/:slug/cancel')
  cancel(
    @Param('slug') slug: string,
    @Body() dto: CancelEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.cancel(slug, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/:slug/postpone')
  postpone(
    @Param('slug') slug: string,
    @Body() dto: PostponeEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.postpone(slug, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/:slug/reschedule')
  reschedule(
    @Param('slug') slug: string,
    @Body() dto: RescheduleEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.reschedule(slug, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/:slug/complete')
  complete(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.complete(slug, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mine/:slug/media')
  addMedia(
    @Param('slug') slug: string,
    @Body() dto: CreateEventMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.addMedia(slug, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/:slug/media/reorder')
  reorderMedia(
    @Param('slug') slug: string,
    @Body() dto: ReorderEventMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.reorderMedia(slug, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/:slug/media/:mediaId')
  updateMedia(
    @Param('slug') slug: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
    @Body() dto: UpdateEventMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.updateMedia(slug, mediaId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('mine/:slug/media/:mediaId')
  removeMedia(
    @Param('slug') slug: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.removeMedia(slug, mediaId, user.id);
  }

  @Get(':slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.eventsService.findPublicBySlug(slug);
  }
}
