# Trailhead tickets — Phoenix Storage Yards (November 11)

Formerly Paddock. Use these as-is (Title + Description). Adjust estimate and priority in Trailhead.

Each ticket can be closed and published on its own. Do not hold the rest of the list for one release. A few items from the call are already finished and are listed at the bottom so they are not reopened.

---

## 1. Publish under Phoenix Storage Yards

**Title:** Brand: publish as Phoenix Storage Yards after the pms DNS record

**Description:**  
The app is still live at pms.paddockparking.com and still labeled Paddock Parking. Nadia adds one A record on phoenixstorageyards.com and leaves the main site alone: host `pms`, value `3.146.118.154`. After pms.phoenixstorageyards.com resolves, relabel this product to Phoenix Storage Yards: public booking, customer portal, admin shell, invite and password emails, and the page title. Do not rename the live yards in the same change. This can go live by itself as soon as that host answers.

---

## 2. Portal invites

**Title:** Portal: a booked customer sets a password from the invite and lands in their portal

**Description:**  
SMTP is already on and Gmail accepted the login. That is not the open part. After staff approve a real booking and send the portal invite, that customer's email must arrive, the link must let them set a password, and sign-in must open their own portal. A dummy portal user does not count. Prove it with one booked customer from approval through the inbox to the portal. This can ship before the lease, COI, charts, or pay work.

---

## 3. Signed lease in the portal

**Title:** Portal: show the lease the customer signed

**Description:**  
David asked for the signed lease on the customer portal. Show that customer the agreement they signed at booking, not a blank template. They open it from their own portal. Staff already keep the lease on the account; this ticket is the customer view. It can go live on its own.

---

## 4. Certificate of insurance example

**Title:** Portal: Additional Insured COI example, built only after David approves the screen

**Description:**  
Upload stays where it is: the customer uploads a certificate of insurance in the portal, and staff can upload one onto that customer too. Add a disclaimer that Phoenix Storage Yards, LLC and the yard address must be listed as Additional Insured. David is emailing a sample certificate. Before any build, remove the confidential parts (names, policy numbers, and other private fields), mark the certificate-holder block in red, and put Phoenix Storage Yards, LLC and the yard address there as the example. Send him that screen. Build it only after he approves. Do not publish this ticket with the others while it is still waiting on him.

---

## 5. Customer dashboard charts

**Title:** Portal dashboard: remove the invoice chart and the payment chart

**Description:**  
Take the invoice chart and the payment chart off the customer dashboard. Keep the account details and the booking details (spot, days, gate code, days left, and the booking and account blocks). Invoices remain on the invoices page. This is a display change and can go live by itself.

---

## 6. Late payment notice

**Title:** Late pay: red notice in the portal, and a late list for staff

**Description:**  
If the customer is late, show a red notice in the portal that they are late on payment. On the admin side, show which customers are late and which are about to miss a payment, so staff can see it without opening each account. This can ship separately from autopull and from the chart removal.

---

## 7. Autopull off, and card or ACH

**Title:** Admin: turn autopull off, then switch that customer between card and ACH

**Description:**  
Checkout already records the agreement to be charged every month. When a customer later asks to be taken off, staff turn autopull off for that customer. The automatic pull stops. After that, invoices are sent manually and the customer pays them in the portal. Staff can also switch that same customer between card and ACH. The Pay button stays hidden while autopull is still on. This ticket is the staff control and the manual-invoice path. It can ship before the portal charge itself is finished.

---

## 8. Portal Pay charges the same way as checkout

**Title:** Portal Pay: charge debit, credit card, or ACH when autopull is off

**Description:**  
When autopull is on, keep Pay hidden. When autopull is off, Pay must take a debit card, a credit card, or ACH the same way checkout does. Right now Pay only records a pending payment and does not charge a card or a bank. A pending row is not a payment. Ship this after staff can turn autopull off. It does not wait on the domain, the lease, or the COI example.

---

## Already finished on this call — do not reopen

- **License plates filled in later.** David confirmed the current booking flow. No new ticket.
- **Photo ID check.** A screenshot that is not a government ID is rejected, and a real ID still goes through. He was shown the error on the call.
- **SMTP login.** Gmail accepted the mailbox. The remaining work is ticket 2, the booked-customer path.
