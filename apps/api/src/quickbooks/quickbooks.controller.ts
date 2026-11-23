import { Controller, Get } from '@nestjs/common';
import { QuickBooksService } from './quickbooks.service.js';

@Controller('quickbooks')
export class QuickBooksController {
  constructor(private readonly quickbooks: QuickBooksService) {}

  @Get('status')
  status() {
    return this.quickbooks.status();
  }
}