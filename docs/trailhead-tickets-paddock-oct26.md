# Trailhead tickets — Paddock Parking Ops

Use these as-is (Title + Description). Adjust estimate/priority in Trailhead.

---

## 1. Inventory — real yard site plans (admin)

**Title:** Inventory: wire live yard site plans for all properties

**Description:**  
Admin Inventory embeds real yard layouts for the three live yards only: Paddock 16 (Elwood), Paddock 325, Paddock 6060. Staff hover/edit spaces; maps are admin-only. Public book site shows inventory counts only — never the layout. Anthem / Rio Vista and Paddock 51 stay out until David adds them.

---

## 2. Inventory — admin UX polish (ops-only maps)

**Title:** Inventory: strip public booking UI from site plans

**Description:**  
Ensure embedded yard maps never show public-site chrome (Reserve, enquiry tips, marketing sidebars, chip filters). Hover/click language is staff-only (“edit status / tenant”). Hard-refresh / cache-bust map assets after updates. Verify on all five yards.

---

## 3. Dashboard — alignment and alert actions

**Title:** Dashboard: fix responsive layout and COI / renewal alert CTAs

**Description:**  
Align top stat cards and per-yard money widgets (equal heights, tabular amounts). Put renewals / COI / bookings alerts in a consistent button row. COI issues CTA opens Compliance → Insurance (not the full customers list). Primary CTA remains Open collections.

---

## 4. Compliance — consolidate under Customers (David pick)

**Title:** Compliance: one worklist under Customers (after David picks mockup)

**Description:**  
David: don’t chase COI and plates on separate lists (same tenant, two calls). Send `docs/compliance-ui-options-for-david.html` (options A/B/C). Recommended B: Customers group → All customers + Compliance (COI + plates + lease gaps on one row). Customer detail adds Access (gate code + vehicles). Later: email/SMS automation for gaps. Follow-up w/ Riki on plate transfer pre-qual is separate.

---

## 5. Nav / shell — consistent expandable groups

**Title:** Sidebar: Properties & Compliance groups match other nav items

**Description:**  
Group buttons (Properties, Compliance) use the same size, icon, and muted color as Dashboard / Customers. Only difference is collapse/expand chevron. Children indented when open. Active highlight applies to the child route, not the parent group color.

---

## 6. Book Now — public marketing under /book

**Title:** Public site: marketing pages under /book (admin stays at /login)

**Description:**  
Customer website lives under `/book/*` (home, spots, locations, etc.). Customer portal at `/portal`. Admin root goes to login → dashboard. App shell treats `/book` and `/portal` as public. Live inventory on `/book/spots` from API.

---

## 7. Book Now — Elwood lease wizard (David flow)

**Title:** Book Now: Elwood-style wizard (lease type, vehicles, COI later)

**Description:**  
Wizard for every location: lease type (spot vs acre), vehicle fields × N with submit-later, acre sizes + “what storing,” lease start, Agreement with exact live copy, Photo ID required / COI submit-later → Compliance. Drop Spot Selection step. Signature pad must not wipe on draw.

---

## 8. Onboarding — FMS-style progress

**Title:** Onboarding: rename Book Now inbox and show applicant progress

**Description:**  
Rename Book Now inbox to Onboarding. Show which step the applicant reached (FMS-style progress). Convert booking → customer + lot; route staff to COI/compliance when docs submit-later.

---

## 9. Leases — landlord/tenant stages

**Title:** Leases: landlord vs tenant views and renewal stage tracking

**Description:**  
Support landlord leases and tenant leases. Track renewal/notice stages (e.g. not contacted → …). Surface renewals-due on dashboard. “Not set” means missing stage — make that clear in UI.

---

## 10. Customers — contract start filter + COI on detail

**Title:** Customers: contract start filter and COI document workflow

**Description:**  
Filter customers by contract/lease start date (Greta). Customer detail supports COI status (valid / expiring / expired / missing / mismatch), notes, and document upload. Align additional-insured legal entity per yard.

---

## 11. Payments — Authorize.net (Greta) card + ACH

**Title:** Payments: Authorize.net card + ACH (replace Stripe/NMI path)

**Description:**  
David: use Greta’s Authorize.net for Paddock (and CrossDoc) — not NMI. Primary: monthly auto ACH debit (pull); send invoice only for tenants who did not authorize ACH. QuickBooks for books / categorization; optional bank-file export as FMS-style fallback. Ops Invoices UI already splits ACH vs send-invoice queues (`docs/david-ach-billing-research.md`). Remaining: live Authorize.net merchant + monthly pull job + Book Now sandbox payment fix.

---

## 12. Collections — David UI option pick + build

**Title:** Collections: implement David-approved collections UI

**Description:**  
Share `docs/collections-ui-options-for-david.html` (options A/B/C). After David picks, rebuild Collections screen to that direction (aging/worklist, pipeline, or yard queue). Keep move / log call / send emails-due behaviors.

---

## 13. Future yards — Anthem / Rio Vista & Paddock 51

**Title:** Data: add Anthem / Rio Vista and Paddock 51 when live

**Description:**  
David confirmed live yards today are only Paddock 16, 325, and 6060. When Anthem / Rio Vista or Paddock 51 go live: add property + site-plan lots, admin map tab, and public inventory card (counts only — no public layout).

---

## 14. Production readiness (backend)

**Title:** Production: Postgres, live notifications, QB sync, wire public book

**Description:**  
Still open for production: Postgres + import from current admin; live SendGrid/Twilio for Notices; QuickBooks sync for dashboard money; point paddockparking.com/book (or parkingpaddock.com) booking at this API.

---

## Optional / keep for now

**Title:** Notices: keep module pending David decision

**Description:**  
Notices (renewal/COI outreach queue) stay available. David unsure if needed long-term — do not remove until he confirms. Yard filter and generate/send demo path remain.
