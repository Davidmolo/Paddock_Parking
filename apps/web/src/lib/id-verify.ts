/**
 * Client-side Photo ID checks (David):
 * 1) Upload should look like a government photo ID (not a random screenshot)
 * 2) Name on ID should match lessee / guarantor signer name
 *
 * Product is US / Phoenix (Paddock) — prefer US DL, state ID, US passport.
 * Also accept common international government photo IDs (passport, national ID).
 * Uses Tesseract OCR in-browser. Production may swap to Persona/Jumio later.
 */

export type IdVerifyStatus =
  | "idle"
  | "checking"
  | "matched"
  | "missing_signer"
  | "name_mismatch"
  | "not_id"
  | "unreadable"
  | "bad_type";

export type IdVerifyResult = {
  status: IdVerifyStatus;
  message: string;
  extractedPreview?: string;
  /** Full OCR text — cache so name edits don’t re-run Tesseract */
  ocrText?: string;
};

const NOT_VALID_ID_MSG =
  "We couldn’t verify this — you didn’t upload a valid government photo ID. Please upload a US driver’s license, state ID, or passport (international passport / national ID also OK).";

/**
 * Strong signals — US first (Paddock is US-based), then common international.
 * Phrases chosen to survive OCR noise.
 */
const STRONG_ID_KEYWORDS = [
  // —— US (primary for Paddock) ——
  "driver license",
  "drivers license",
  "driver's license",
  "driving license",
  "commercial driver",
  "state id",
  "identification card",
  "real id",
  "federal limits apply",
  // —— International (also OK) ——
  "passport",
  "driver licence",
  "drivers licence",
  "driving licence",
  "identity card",
  "national id",
  "government of",
  "aadhaar",
];

const SUPPORT_ID_KEYWORDS = [
  // US DL / state ID fields + common state names on US cards
  "date of birth",
  "dob",
  "expir",
  "class",
  "organ donor",
  "federal limits",
  "height",
  "eyes",
  "sex",
  "license",
  "licence",
  "driver",
  "identification",
  "department of",
  "state of",
  "motor vehicle",
  "dmv",
  "united states",
  "usa",
  "arizona",
  "california",
  "texas",
  "florida",
  "new york",
  // International / government photo IDs
  "date of issue",
  "ministry of",
  "id card",
  "designation",
  "issuing authority",
  "card holder",
  "commissioner",
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
  // Full-name contiguous match (most reliable when OCR is clean)
  if (hay.includes(normalizeName(signerName))) return true;
  const hits = tokens.filter((t) => hay.includes(t));
  if (tokens.length === 1) return hits.length === 1;
  // First + last is enough for 2+ part names (OCR often mangles middle tokens)
  if (tokens.length >= 2) {
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    if (hay.includes(first) && hay.includes(last)) return true;
  }
  const need =
    tokens.length <= 2 ? tokens.length : Math.ceil(tokens.length * 0.66);
  return hits.length >= need;
}

export function scoreGovernmentId(ocrText: string): {
  score: number;
  strong: number;
} {
  const hay = ` ${normalizeName(ocrText)} `;
  let score = 0;
  let strong = 0;
  for (const kw of STRONG_ID_KEYWORDS) {
    if (hay.includes(kw)) {
      score += 3;
      strong += 1;
    }
  }
  for (const kw of SUPPORT_ID_KEYWORDS) {
    if (hay.includes(kw)) score += 1;
  }

  // "ID Card No." often OCRs as "10 Gard No" / "1D Gard No" / "ID Gard No"
  if (/\b(id|1d|10|i0)\s*(card|gard|caro|cara)\s*no\.?/i.test(ocrText)) {
    score += 3;
    strong += 1;
  } else if (/\bid\s*card\s*no\.?/i.test(ocrText)) {
    score += 3;
    strong += 1;
  }

  // DL / ID number patterns
  if (/\b(dl|id)\s*[#:]?\s*[a-z0-9]{4,}/i.test(ocrText)) score += 2;
  // DOB / issue dates: 01.01.1960 or 01/01/1960
  if (/\b\d{2}[./-]\d{2}[./-]\d{2,4}\b/.test(ocrText)) score += 1;

  // Government employee / office photo IDs
  if (hay.includes("government") && (hay.includes("id") || hay.includes("card"))) {
    score += 2;
    if (strong === 0) strong += 1;
  }
  // Name + DOB together is a strong photo-ID layout signal
  if (
    (hay.includes("date of birth") || hay.includes(" dob ")) &&
    (/\bname\b/i.test(ocrText) || hay.includes("designation"))
  ) {
    score += 2;
  }

  return { score, strong };
}

/** Screenshots fail; licenses, passports, and government photo IDs pass. */
export function looksLikeGovernmentId(ocrText: string): boolean {
  const { score, strong } = scoreGovernmentId(ocrText);
  if (strong >= 1 && score >= 4) return true;
  return strong === 0 && score >= 7;
}

/** Pure logic after OCR — unit-testable without Tesseract. */
export function evaluateIdOcr(args: {
  ocrText: string;
  lesseeName: string;
  guarantorName: string;
}): IdVerifyResult {
  const cleaned = args.ocrText.replace(/\s+/g, " ").trim();
  const signer =
    args.guarantorName.trim() || args.lesseeName.trim() || args.lesseeName;

  if (!normalizeName(signer)) {
    return {
      status: "missing_signer",
      message:
        "Enter your signer name above first, then upload your Photo ID so we can match the name.",
      ocrText: cleaned || undefined,
    };
  }

  if (cleaned.length < 12) {
    return {
      status: "not_id",
      message: NOT_VALID_ID_MSG,
      extractedPreview: cleaned.slice(0, 80),
      ocrText: cleaned,
    };
  }

  const conf = scoreGovernmentId(cleaned);
  if (!looksLikeGovernmentId(cleaned)) {
    return {
      status: "not_id",
      message: NOT_VALID_ID_MSG,
      extractedPreview: cleaned.slice(0, 120),
      ocrText: cleaned,
    };
  }

  const lesseeOk = namesMatchOcr(args.lesseeName, cleaned);
  const guarantorOk = namesMatchOcr(
    args.guarantorName || args.lesseeName,
    cleaned,
  );
  if (!lesseeOk && !guarantorOk) {
    // Only blame the name when we're confident this is a real ID
    if (conf.strong >= 1 && conf.score >= 5) {
      return {
        status: "name_mismatch",
        message: `Name on the ID doesn’t match “${signer}”. Use the same name as on your Photo ID, or upload the correct ID.`,
        extractedPreview: cleaned.slice(0, 120),
        ocrText: cleaned,
      };
    }
    return {
      status: "not_id",
      message: NOT_VALID_ID_MSG,
      extractedPreview: cleaned.slice(0, 120),
      ocrText: cleaned,
    };
  }

  return {
    status: "matched",
    message: "Photo ID verified — name matches your signer details.",
    extractedPreview: cleaned.slice(0, 80),
    ocrText: cleaned,
  };
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

  if (
    !normalizeName(args.guarantorName.trim() || args.lesseeName.trim())
  ) {
    return {
      status: "missing_signer",
      message:
        "Enter your signer name above first, then upload your Photo ID so we can match the name.",
    };
  }

  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, {
      logger: () => undefined,
    });
    const {
      data: { text },
    } = await worker.recognize(args.file);
    await worker.terminate();

    return evaluateIdOcr({
      ocrText: text,
      lesseeName: args.lesseeName,
      guarantorName: args.guarantorName,
    });
  } catch {
    return {
      status: "unreadable",
      message:
        "Could not read that image. Please upload a clearer photo of your government ID.",
    };
  }
}

