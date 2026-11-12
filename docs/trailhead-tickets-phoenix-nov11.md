# Trailhead tickets — Phoenix Storage Yards (November 11)

Local only. Not deployed. Each ticket is a title, a short description, and where to see the outcome.

From here on, write every ticket the same way.

Staff: http://localhost:3000/login — `admin` / `paddockparking`  
Customer: http://localhost:3000/portal — `demo.portal@paddockparking.com` / `Portal123`  
Public site: http://localhost:3000/book

Demo Tenant is the customer to open. Autopull is off, the charge method is card, the balance is $100, and the account is past due.

---

## 1

**Title:** Brand: the product is named Phoenix Storage Yards

**Description:**  
The booking site, portal, admin shell, page title, and emails say Phoenix Storage Yards. The mark is PS. The yards are still Paddock 16, Paddock 325, and Paddock 6060. The public address is still pms.paddockparking.com until Nadia adds the A record.

**Where to see the outcome:**  
http://localhost:3000/book — the tab and the header say Phoenix Storage Yards. Sign in as admin and the sidebar shows the same name. http://localhost:3000/portal says “Sign in to your Phoenix Storage Yards account.”

---

## 2

**Title:** Nav: Onboarding sits above Customers

**Description:**  
Onboarding was moved above Customers. The order is Overview, Onboarding, Customers, Properties, Invoices.

**Where to see the outcome:**  
http://localhost:3000/dashboard, left sidebar. Click Onboarding. It opens http://localhost:3000/bookings, heading Onboarding Profiles.

---

## 3

**Title:** Portal: staff send an invite and the customer sets a password

**Description:**  
Staff send a portal invite from an approved booking. The link lasts 7 days. The customer sets a password from that link, and the portal becomes active.

**Where to see the outcome:**  
http://localhost:3000/bookings. Open Demo Tenant LLC. The profile says “Portal active — customer set their password.” On a booking that is not active yet, the button is “Send portal invitation.”

---

## 4

**Title:** Portal: the customer sees the lease they signed

**Description:**  
The portal shows the agreement and the personal guaranty from the booking, including who signed and the date.

**Where to see the outcome:**  
Sign in as Demo Tenant and open http://localhost:3000/portal/lease. The heading is Lease. The line under it is “The agreement you signed when you booked.”

---

## 5

**Title:** Book: the success screen says the spot is auto-confirmed and reserved

**Description:**  
A parking booking ends with “Auto-confirmed — spot reserved.” An acre booking ends with “Auto-confirmed — space reserved.” The review step says the spot is reserved when they finish.

**Where to see the outcome:**  
http://localhost:3000/book/spots, pick a space, go to Step 4, Review Your Booking. The line is “Your spot is reserved when you finish.” Do not submit. The success heading appears only after the booking is submitted.

---

## 6

**Title:** COI: the customer uploads a certificate, with the Additional Insured line David approved

**Description:**  
David approved the certificate example. The customer can upload a certificate of insurance from the portal, and staff can still upload one on the customer record. Next to the upload is his line: “Please have Phoenix Storage Yards, LLC and the yard address listed as Additional Insured,” followed by that customer’s yard address.

**Where to see the outcome:**  
Sign in as Demo Tenant and open http://localhost:3000/portal/finish. The card is “Upload certificate of insurance.” The line under it is his sentence, then “2005 E Elwood St, Phoenix, AZ 85040.” Choose file uploads the certificate. The same sentence and address are on http://localhost:3000/customers/c-portal-demo, on the Certificate of insurance card, above the staff upload.

---

## 7

**Title:** Portal dashboard: invoice and payment charts are removed

**Description:**  
The invoice chart and the payment chart are off the customer dashboard. The plot, days, gate code, booking, and account stay. Invoices stay on the invoices page.

**Where to see the outcome:**  
http://localhost:3000/portal as Demo Tenant. The dashboard has Plot P-D1 and P-D2, Days here, Days left, Gate code 2468, Your booking, and Your account. No chart. http://localhost:3000/portal/invoices still has the invoice table and the payments table.

---

## 8

**Title:** Late pay: a red notice for the customer, and a late list for staff

**Description:**  
A customer with an overdue balance sees “You are late on payment.” Staff see who is already late, and who is due within 7 days but not late yet.

**Where to see the outcome:**  
http://localhost:3000/portal as Demo Tenant. The red line is “You are late on payment.” Balance is $100. As admin, http://localhost:3000/collections. The first card is “About to miss a payment,” with Fisk & Sons, Paddock 325, Nov 15, 2026, $200.79. The table under it is who is already late.

---

## 9

**Title:** Admin: turn autopull off, or switch that customer between card and ACH

**Description:**  
Staff turn autopull off when the customer wants to pay by hand, or switch that customer between card and ACH. “Waive auto-pull” is gone. Pay stays hidden while autopull is on. Send invoice is available only while it is off.

**Where to see the outcome:**  
http://localhost:3000/customers/c-portal-demo. The Autopull card says “Charge with: Card.” The buttons are “Turn autopull on,” “Switch to ACH,” and “Send invoice.” Do not turn autopull on if you still need to show Pay.

---

## 10

**Title:** Portal Pay: debit, credit card, or ACH when autopull is off

**Description:**  
When autopull is off, Pay takes a debit or credit card, or ACH, the same way checkout does. A smaller amount leaves the rest due. A card or account ending in 9995 is declined and nothing is taken. There is no live Authorize.net charge.

**Where to see the outcome:**  
http://localhost:3000/portal/invoices as Demo Tenant. Pay is on inv-demo-partial, balance $100. The choices are “Debit or credit card (3.5% merchant fee)” and “ACH bank transfer (fee TBD).” Payments on that page show $100 Declined and $50 Cleared. The same two rows are on http://localhost:3000/customers/c-portal-demo, and the account says Past due, Balance $100.

---

## 11

**Title:** Onboarding: staff choose whether an approval includes a gate code

**Description:**  
On approve or conditional approve, staff check “Give a gate code” or leave it off. Checked creates a 4-digit code. Unchecked creates the customer with no code. The box starts checked.

**Where to see the outcome:**  
http://localhost:3000/bookings. Open a pending profile, such as Chris Binder Hauling. Above Approve is the checkbox “Give a gate code,” and it is checked. Open Desert Line Logistics on the Approved tab. That approval was done with the box off, and the profile says “No gate code.”

---

## 12

**Title:** Documents: lease and certificate sit under one Documents section

**Description:**  
The customer record has one Documents section. Lease holds the lease details and the lease file. Certificate of insurance holds the example, the Additional Insured line, the yard address, and the certificate fields.

**Where to see the outcome:**  
http://localhost:3000/customers/c-portal-demo. Under Documents, the first heading is Lease, with Upload lease PDF. The next heading is Certificate of insurance, with Save COI, Use yard entity name, and Upload COI.

---

## 13

**Title:** COI: the approved sample opens full size in a new tab

**Description:**  
Staff and the customer can open the certificate example David approved. The preview stays on the page. Clicking the preview opens the full certificate in a new browser tab.

**Where to see the outcome:**  
Sign in as Demo Tenant and open http://localhost:3000/portal/finish. Open “Certificate of insurance example.” The preview sits at the top left. Click it. A new tab shows the full certificate. The same button is on http://localhost:3000/customers/c-portal-demo, under Certificate of insurance.

---

## 14

**Title:** COI: a PDF fills the certificate fields, and a photo does not

**Description:**  
Uploading a certificate PDF fills the policy number, effective date, expiration date, and additional insured when those are on the page. A photo is stored and leaves the fields as they are. Staff can still type the fields and press Save COI.

**Where to see the outcome:**  
http://localhost:3000/customers/c-portal-demo. The certificate fields show Policy # GL 100200-01, Effective 2026-03-01, Expires 2027-03-01, and Additional insured Phoenix Storage Yards, LLC. The file list includes coi-sample-upload.pdf. Uploading coi-sample-upload.png does not change those fields.

---

## 15

**Title:** Documents: the file list scrolls, and Open shows the file in a new tab

**Description:**  
The certificate file list stops at a fixed height and then scrolls. Clicking a file opens it full size in a new browser tab. The customer’s On file list does the same.

**Where to see the outcome:**  
http://localhost:3000/customers/c-portal-demo. Under Upload COI, the file list scrolls. Click a row such as coi-sample-upload.pdf. A new tab shows the file. As Demo Tenant, http://localhost:3000/portal/finish, the On file table scrolls, and Open does the same.

---

## 16

**Title:** COI: an uploaded PDF stores the certificate fields

**Description:**  
When staff or the customer upload a certificate PDF, the system stores every value it can read. An empty carrier does not block that save. Policy number, effective date, expiration date, and additional insured are stored on their own. Save COI stores the carrier after staff type it, and stores any correction they type afterward. A photo is stored as a file and leaves the fields as they are.

**Where to see the outcome:**  
http://localhost:3000/customers/c-portal-demo. Policy # is GL 100200-01, Effective is 2026-03-01, Expires is 2027-03-01, and Additional insured is Phoenix Storage Yards, LLC. Those four are already stored. Carrier is blank because that sample has no insurer name. The same upload is Choose file on http://localhost:3000/portal/finish as Demo Tenant. Do not upload coi-sample-upload.png if you want those fields to stay.
