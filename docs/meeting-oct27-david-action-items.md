# Daily meeting — Oct 27, 2026 · David / Shahmeer / Maaz

**Focus:** Book Now / Review & Pay rules, FMS-like nav, onboarding, inventory, collections direction.  
**Note:** David shared FMS / Carl UI references on screen — screenshots to be attached by Shahmeer; use those when refining onboarding stages + customer list columns.

---

## What David cares about (short)

1. **Don’t lose signups** — lock payment first, then lock in auto-pull; don’t scare people off with optional “I don’t agree.”
2. **Auto-pay is the default product** — ACH / card auto-pull every ~28 days; invoice chase is the exception (admin unlock only).
3. **One call for compliance gaps** — already covered in compliance mockups; same idea for missing ACH auth later.
4. **FMS shape for ops** — Overview / Customers / Onboarding / Invoices; leads & tenant gaps live near Customers.
5. **Inventory like a salon map** — click a space, see price / tenant / coming soon; occupancy % per yard; **not** on the public site.
6. **Collections** — lean QuickBooks-style aging (tighter buckets), not the current messy board; wait for mockup pick.

---

## Action items

### Book Now / onboarding (public)

| # | Owner | Item | Detail |
|---|--------|------|--------|
| 1 | Shahmeer | **Plates: remove “required” copy** | “Fill plate out later” is enough; don’t mention compliance to the customer. |
| 2 | Shahmeer | **COI upload optional** | “Upload COI later” disables / skips COI; flow still completes → staff compliance. |
| 3 | Shahmeer | **Research ID ↔ name match** | Guarantor / signer name vs driver’s license OCR — research libs; **report back**, don’t build yet. |
| 4 | Shahmeer + Maaz | **Wire payment gateway** | Card + debit + ACH (Greta Authorize.net). Blocked until merchant/fees known. |
| 5 | Shahmeer | **Get card fees from Greta** | **Greta (reply):** CC **3.5%** confirmed. ACH **still negotiating**. UI: card `3.5% merchant fee`, ACH `fee TBD` until she sends the ACH amount/label. |
| 6 | Shahmeer | **Review & Pay: required auto-pull** | One required checkbox, positive wording (“stress-free auto-payment every 28 days / 4 weeks”). **No** “I don’t agree” option for the customer. On payment step (step 4), not Agreement. |
| 7 | Shahmeer | **Admin override for auto-pull** | Onboarding list (FMS-style stages): staff can unlock / waive ACH requirement for that applicant only when they call in. Customer never sees a “decline” path. |
| 8 | — | **Art / David** | Confirmed direction in-call: require auto-pull publicly; exception only via backend. |

### Nav / Customers / FMS alignment

| # | Owner | Item | Detail |
|---|--------|------|--------|
| 9 | Shahmeer | **Restructure nav FMS-like** | Overview · Customers · Onboarding · Invoices (keep Properties / Inventory). Move **leads / tenant lease chase** under Customers (not a lonely Leases-only mental model). |
| 10 | David | **Review FMS onboarding stages doc** | Shahmeer shared in chat — confirm KYC / stages before cloning FMS 1:1. |
| 11 | Shahmeer | **Customer list: security deposit column** | Show deposit on roster (Carl / FMS convenience). Gate code optional on table — prefer open detail. |
| 12 | Shahmeer | **Customer list: Compliance chips** | Align with compliance mockups (COI / plates / lease) so directory isn’t a second competing COI UI. |

### Inventory (admin only)

| # | Owner | Item | Detail |
|---|--------|------|--------|
| 13 | Shahmeer | **Available soon status** | When lease enters notice window (e.g. 60 days): occupied → “available soon” / renewal soon; show on map. |
| 14 | Shahmeer | **Per-lot sidebar: edit price** | Click space on map → change rate + status (available / reserved / occupied / available soon). Map beats numeric “Paddock 3” list confusion. |
| 15 | Shahmeer | **Occupancy % per yard** | With map / yard header (Carl-style 83% / 96%). Address + occupied / available counts. |
| 16 | — | **Public site** | Still **no** layout maps for customers (inventory counts only) — competitors mustn’t see fullness. |

### Collections

| # | Owner | Item | Detail |
|---|--------|------|--------|
| 17 | Shahmeer | **New collections mockups (QB aging)** | David didn’t pick A/B/C; wants QuickBooks-like aging: Current · 1–15 · 16–30 · … + customer, due date, balance, notes/stages. **Don’t rebuild UI until he approves.** |
| 18 | David | **Pick collections layout** | After new mockups land. |

### Already in flight / related packs

| Doc | Purpose |
|-----|---------|
| `docs/compliance-ui-options-for-david.html` | Consolidate COI + plates + lease under Customers |
| `docs/collections-ui-options-for-david.html` | Prior A/B/C — supersede with QB-aging variants |
| `docs/david-ach-billing-research.md` | ACH primary vs invoice opt-out (ops) |

---

## Decisions locked in this meeting

- **Auto-pull:** Required on Review & Pay (one agree checkbox). Customer cannot opt out in UI.
- **Exception path:** Admin only — onboarding applicant → waive ACH / auto-pull for that person.
- **Fees:** Show Greta’s card surcharge next to card options; ACH called out as $0 / no surcharge.
- **COI / plates on public book:** Optional / fill later; no “goes to compliance” customer-facing language.
- **Inventory polish:** Admin map + available soon + pricing sidebar + occupancy %; public stays counts-only.
- **Collections:** Hold implementation; David wants QB-style aging mockups next.

---

## Waiting on Shahmeer (attachments)

Paste / drop FMS & Carl screenshots David showed (customer list, onboarding stages, occupancy, pricing editor). Label each: what David liked vs what he called messy. Then refine onboarding stages + customer columns against those refs.

---

## Implemented in app (Oct 27 follow-up) — still need from you

| Done in code | Still need |
|---|---|
| Book: plates optional + “fill later” (no compliance wording); COI later copy cleaned | Confirm Greta **exact** card % / ACH fee labels |
| Review & Pay: fee placeholders + **required** auto-pull checkbox | Live Authorize.net (Maaz / Greta merchant) |
| Onboarding: **Waive auto-pull** / restore per applicant | — |
| Nav: Customers group (All / Compliance / Leases); Overview label | David pick if Leases should stay nested |
| `/customers/compliance` consolidated worklist | Soft-confirm Option B (already built as B) |
| Customers list: **security deposit** column | FMS screenshots for further column tweaks |
| Inventory: **available soon** status, occupancy %, map sidebar price already editable | Auto flip occupied→available soon from lease notice window (rule TBD) |
| Collections: `docs/collections-qb-aging-for-david.html` | David **approve** before rebuilding `/collections` |
| ID↔name match | Research note only — no build yet |
