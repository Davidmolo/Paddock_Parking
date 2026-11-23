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
      message: connected
        ? 'QuickBooks is connected for dev sync.'
        : ready
          ? 'Keys are set. Add QUICKBOOKS_REALM_ID to connect a company.'
          : 'Waiting on dev keys from David.',
    };
  }
}