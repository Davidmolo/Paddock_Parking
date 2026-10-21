# Paddock Parking Ops

Staff admin for yard operations: money, occupancy, tenants, lots, aging collections, landlord + tenant leases, COI tracking, notices, and Book Now inbox.

Built with NestJS + Next.js. Demo uses in-memory seed data (no Postgres yet).

## Stack

- **apps/web** — Next.js (App Router), Tailwind CSS, Framer Motion, TanStack Query
- **apps/api** — NestJS, in-memory seed + local document uploads under `apps/api/uploads`

## Quick start

```bash
pnpm install
pnpm --filter @paddockparking/api start:dev
pnpm --filter @paddockparking/web dev
```

Or from root: `pnpm dev` (runs both).

- Web: http://localhost:3000 (Next may use 3001+ if busy)
- API: http://localhost:4001

### Demo login

- Username: `admin`
- Password: `paddockparking`

## What’s in the demo

| Area | What you can do |
|------|-----------------|
| Dashboard | Revenue / occupancy rundown, renewals + COI + booking chips |
| Collections | Aging queues, move queue, log call, send emails due (demo) |
| Customers | Tenant profile, edit COI, upload lease/COI PDF |
| Lots | Status / rate / assignment |
| Leases | Landlord + tenant leases, edit renewal + lead days, renewals-due |
| Notices | Generate renewal/COI messages, send (logged — not live email/SMS) |
| Book Now inbox | Add booking, convert → tenant + lot + pending lease |
| Properties / Invoices | Yard portfolio + billing ledger |
| Profile | Edit name/email/phone, change password |

David walkthrough deck: `docs/paddock-parking-david-demo.html`

## Demo vs production

**Working in demo (local):** all screens above against seed data. Edits reset when the API restarts.

**Needs credentials / infra for production:**

- Real database + import from current admin
- SendGrid / Twilio for live email & SMS
- QuickBooks sync for live money figures
- Wire paddockparking.com Book Now → this API
- Auth guards on API routes (demo login only protects the UI)

## Environment

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4001
```

`apps/api/.env`:

```
PORT=4001
```
