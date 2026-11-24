import { Injectable } from '@nestjs/common';

@Injectable()
export class QuickBooksService {
  status() {
    const ready = Boolean(
      process.env.QUICKBOOKS_CLIENT_ID?.trim() &&
        process.env.QUICKBOOKS_CLIENT_SECRET?.trim(),
    );
    const connected = ready && Boolean(process.env.QUICKBOOKS_REALM_ID?.trim());
    return {
      ready,
      connected,
      companies: [
        { yard: 'Paddock 16', company: 'Paddock Storage Yards 16 LLC' },
        { yard: 'Paddock 325', company: 'Paddock Parking 325' },
        { yard: 'Paddock 6060', company: 'Paddock Parking' },
        { yard: '925 East Elwood', company: 'Phoenix Storage Yards' },
      ],
      message: connected
        ? 'QuickBooks is connected for dev sync.'
        : ready
          ? 'Keys are set. Add QUICKBOOKS_REALM_ID to connect a company.'
          : 'Waiting on dev keys from Nadia.',
    };
  }
}