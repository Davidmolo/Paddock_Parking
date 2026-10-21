import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { OpsNotification } from '../data/seed.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Query('status') status?: OpsNotification['status'],
    @Query('propertyId') propertyId?: string,
  ) {
    return this.notificationsService.findAll(status, propertyId);
  }

  @Get('summary')
  summary(@Query('propertyId') propertyId?: string) {
    return this.notificationsService.summary(propertyId);
  }

  @Post('generate')
  generate(@Query('propertyId') propertyId?: string) {
    return this.notificationsService.generate(propertyId);
  }

  @Post('send-all')
  sendAll() {
    return this.notificationsService.sendAllPending();
  }

  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.notificationsService.send(id);
  }
}
