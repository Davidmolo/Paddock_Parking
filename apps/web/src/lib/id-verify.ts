/**
 * Client-side Photo ID checks (David):
 * 1) Upload should look like a government ID (not a random photo)
 * 2) Name on ID should match lessee / guarantor signer name
 *
 * Uses Tesseract OCR in-browser. Production may swap to Persona/Jumio later.
 */

export type IdVerifyStatus =
  | "idle"
  | "checking"
  | "matched"
  | "name_mismatch"
  | "not_id"
  | "unreadable"
  | "bad_type";

export type IdVerifyResult = {
  status: IdVerifyStatus;
  message: string;
  extractedPreview?: string;
};

const ID_KEYWORDS = [
  "driver",
  "licence",
  "license",
  "passport",
  "identification",
  "identity",
  "department of",
  "state of",
  "date of birth",
  "dob",
  "expir",
  "class",
  "dl ",
  " id ",
  "usa",
  "united states",
  "arizona",
  "california",
  "texas",
  "florida",
  "new york",
  "sex",
  "height",
  "eyes",
  "organ donor",
  "federal limits",
];

function normalizeName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(s: string) {
  return normalizeName(s)
    .split(" ")
    .filter((t) => t.length >= 2 && !["jr", "sr", "ii", "iii", "iv"].includes(t));
}

/** True if most name tokens appear in OCR text (order-independent). */
export function namesMatchOcr(
  signerName: string,
  ocrText: string,
): boolean {
  const tokens = nameTokens(signerName);
  if (tokens.length === 0) return false;
  const hay = normalizeName(ocrText);
  const hits = tokens.filter((t) => hay.includes(t));
  if (tokens.length === 1) return hits.length === 1;
  // Require at least 2 tokens, or all if only 2 names
  const need = tokens.length <= 2 ? tokens.length : Math.ceil(tokens.length * 0.66);
  return hits.length >= need;
}

export function looksLikeGovernmentId(ocrText: string): boolean {
  const hay = ` ${normalizeName(ocrText)} `;
  let hits = 0;
  for (const kw of ID_KEYWORDS) {
    if (hay.includes(kw)) hits += 1;
  }
  // Also: long digit runs (DL numbers) + word "name" or "address"
  if (/\d{5,}/.test(ocrText)) hits += 1;
  if (/\bname\b/i.test(ocrText)) hits += 1;
  return hits >= 2;
}

export function assertIdImageFile(file: File): IdVerifyResult | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const okMime =
    type.startsWith("image/") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".heic");
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return {
      status: "bad_type",
      message:
        "Please upload a clear photo of your government ID (JPG or PNG), not a PDF.",
    };
  }
  if (!okMime) {
    return {
      status: "bad_type",
      message: "Photo ID must be an image file (JPG, PNG, or similar).",
    };
  }
  if (file.size > 12 * 1024 * 1024) {
    return {
      status: "bad_type",
      message: "Image is too large. Please upload a file under 12 MB.",
    };
  }
  return null;
}

export async function verifyPhotoId(args: {
  file: File;
  lesseeName: string;
  guarantorName: string;
}): Promise<IdVerifyResult> {
  const typeErr = assertIdImageFile(args.file);
  if (typeErr) return typeErr;

  const signer =
    args.guarantorName.trim() || args.lesseeName.trim() || args.lesseeName;
  if (!normalizeName(signer)) {
    return {
      status: "name_mismatch",
      message: "Enter your signer name before uploading your Photo ID.",
    };
  }

  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, {
      // Keep logs quiet in UI
      logger: () => undefined,
    });
    const {
      data: { text },
    } = await worker.recognize(args.file);
    await worker.terminate();

    const cleaned = text.replace(/\s+/g, " ").trim();
    if (cleaned.length < 12) {
      return {
        status: "unreadable",
        message:
          "We couldn’t read that image. Upload a clearer photo of your government-issued ID.",
        extractedPreview: cleaned.slice(0, 80),
      };
    }

    if (!looksLikeGovernmentId(cleaned)) {
      return {
        status: "not_id",
        message:
          "This doesn’t look like a government ID. Please upload a driver’s license, state ID, or passport photo.",
        extractedPreview: cleaned.slice(0, 120),
      };
    }

    const lesseeOk = namesMatchOcr(args.lesseeName, cleaned);
    const guarantorOk = namesMatchOcr(args.guarantorName || args.lesseeName, cleaned);
    if (!lesseeOk && !guarantorOk) {
      return {
        status: "name_mismatch",
        message: `Name on the ID doesn’t match “${signer}”. Use the same name as on your Photo ID, or upload the correct ID.`,
        extractedPreview: cleaned.slice(0, 120),
      };
    }

    return {
      status: "matched",
      message: "Photo ID verified — name matches your signer details.",
      extractedPreview: cleaned.slice(0, 80),
    };
  } catch {
    return {
      status: "unreadable",
      message:
        "Could not verify this photo right now. Try another clear image of your ID.",
    };
  }
}
