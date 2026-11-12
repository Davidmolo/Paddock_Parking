---
name: trailhead-tickets
description: Writes Phoenix Storage Yards Trailhead tickets as a title, a short description, and where to see the outcome. Use when the user asks for a ticket, a Trailhead ticket, or where to see an outcome.
---

# Trailhead tickets

Write every ticket as three parts only.

**Title:** one line. Area first, then what changed.

**Description:** two or three sentences. What staff or the customer can do.

**Where to see the outcome:** the local URL, who to sign in as, and the exact label on the screen. Say what not to click when a click would change demo data.

Do not add acceptance criteria, steps, owners, or estimates.

Append the ticket to `docs/trailhead-tickets-phoenix-nov11.md`. Do not rewrite earlier tickets.

Staff: http://localhost:3000/login — `admin` / `paddockparking`  
Customer: http://localhost:3000/portal — `demo.portal@paddockparking.com` / `Portal123`

## Example

**Title:** Onboarding: staff choose whether an approval includes a gate code

**Description:**  
On approve or conditional approve, staff check “Give a gate code” or leave it off. Checked creates a 4-digit code. Unchecked creates the customer with no code. The box starts checked.

**Where to see the outcome:**  
http://localhost:3000/bookings. Open a pending profile, such as Chris Binder Hauling. Above Approve is the checkbox “Give a gate code,” and it is checked. Open Desert Line Logistics on the Approved tab. That approval was done with the box off, and the profile says “No gate code.”
