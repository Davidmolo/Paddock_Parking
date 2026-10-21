import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { CollectionsModule } from './collections/collections.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DataModule } from './data/data.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { LeasesModule } from './leases/leases.module.js';
import { LotsModule } from './lots/lots.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PropertiesModule } from './properties/properties.module.js';

@Module({
  imports: [
    DataModule,
    AuthModule,
    DashboardModule,
    PropertiesModule,
    LotsModule,
    CustomersModule,
    BookingsModule,
    CollectionsModule,
    InvoicesModule,
    LeasesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

