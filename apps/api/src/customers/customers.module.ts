import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller.js';
import { PortalController } from './portal.controller.js';
import { CustomersService } from './customers.service.js';

@Module({
  controllers: [CustomersController, PortalController],
  providers: [CustomersService],
})
export class CustomersModule {}
