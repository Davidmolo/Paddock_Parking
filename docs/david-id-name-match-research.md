# Photo ID ↔ signer name match (research note for David)

**Ask:** If someone types “David Molo” but uploads an ID that says “Patrick Johnson,” can the system catch that? Also reject non-ID photos.

## What we shipped (demo / Book Now)

- **Client OCR** with [Tesseract.js](https://tesseract.projectnaptha.com/) on Photo ID upload (Agreement step).
- Checks the image looks like a **government ID** (license / passport keywords, DOB, etc.).
- Fuzzy-matches OCR text to **Lessee** and **Guarantor** signer names.
- Blocks “Next” until status is **matched**.

## Limits (honest)

| Approach | Accuracy | Cost | Notes |
|---|---|---|---|
| Tesseract in browser | Medium | Free | Blurry photos fail; lighting matters; not KYC-grade |
| Persona / Jumio / Stripe Identity | High | Paid | Proper ID + face + fraud signals |
| AWS Textract / Google Document AI | High | Paid | Server-side OCR; still need name policy |

**Recommendation:** Keep Tesseract as a first filter for Paddock Book Now. For production KYC (especially personal guarantee), wire **Persona or Jumio** when Greta/ops approve budget — same place in the flow, swap the verifier.

## Product rules (current)

1. Photo ID required (image, not PDF).
2. COI can still be “upload later.”
3. Name on ID must match signer name(s) typed on Agreement.
