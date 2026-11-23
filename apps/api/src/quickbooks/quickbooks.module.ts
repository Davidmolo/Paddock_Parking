import { Module } from '@nestjs/common';
import { QuickBooksController } from './quickbooks.controller.js';
import { QuickBooksService } from './quickbooks.service.js';

@Module({
  controllers: [QuickBooksController],
  providers: [QuickBooksService],
})
export class QuickBooksModule {}