# Paddock billing — ACH research note for David

**Meeting ask:** Stop relying on “send invoice → wait for customer to pay.” Prefer **automatic ACH debit** (we pull once a month). Still support **send invoice** for tenants who did not agree to ACH.

**Volume context:** Paddock ≈ **1 charge / customer / month** (unlike Blue Stallion’s many charges per month). Simpler ACH cadence.

---

## Options compared

| Path | How it works | Fit for David’s “we pull” |
|---|---|---|
| **A. Greta Authorize.net ACH** | Merchant processing Greta sets up for CrossDoc + Paddock. Card + ACH. App schedules monthly debit when rent is due. | **Best primary** — David already directed: use Greta Authorize.net for both companies. |
| **B. Bank file (FMS-style)** | Export due invoices → upload NACHA/ACH file to bank → money pulls. QuickBooks used only to categorize afterward. | Works; more ops friction each month. Good fallback. |
| **C. QuickBooks Payments / ACH** | QB may auto-send invoices and offer customer pay links; ACH debit capability depends on QB Payments / bank setup. | Fine for **books + invoice opt-outs**; don’t assume it replaces Authorize.net pull without verifying Greta’s QB plan. |
| **D. NMI** | Card + ACH gateway (Cesar / Lior discussion). | **Not chosen** — David: use Greta Authorize.net, not NMI. |

---

## Recommendation

1. **Primary collection:** Greta **Authorize.net ACH debit** — on due date, pull rent for tenants with ACH authorized (`achEnabled`).
2. **Opt-out path:** Tenants without ACH → **send invoice** (email / portal) and track open/overdue as today.
3. **QuickBooks:** Keep as **ledger / categorization** (and optional sync of invoice records). Do not block ACH on QB unless David confirms QB Payments can do the pull he wants.
4. **Book Now checkout:** Already stubbed for Authorize.net card + ACH so new tenants can authorize debit at signup.
5. **Fees (Greta, Oct 2026):** Card / debit surcharge **3.5%** confirmed. **ACH fee still negotiating** — do not show $0 until she confirms amount/label. Sandbox Authorize.net can proceed without live domain; production after domain + merchant go-live.

---

## Product rules (implemented in Ops Invoices UI)

- Each charge shows **ACH debit (auto-pull)** vs **Send invoice** from the tenant’s ACH flag.
- Staff can filter the ledger by collection method.
- Live gateway pull is **future work**; UI + data model encode David’s policy now.

---

## Next engineering (when Greta merchant is live)

- [ ] Store Authorize.net customer/payment-profile IDs on tenant
- [ ] Monthly job: for `ach_debit` open invoices → create ACH transaction
- [ ] Webhook: mark paid / failed; failed ACH → Collections queue
- [ ] Optional QB sync of payment results for accounting
