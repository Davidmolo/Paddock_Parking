"use client";

import { cn } from "@/lib/utils";

type Props = {
  name: string;
  number: string;
  exp: string;
  cvv: string;
  /** Flip to CVV strip while customer edits security code */
  showBack?: boolean;
  className?: string;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(raw: string) {
  const d = digitsOnly(raw).slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim() || "•••• •••• •••• ••••";
}

function brandFromNumber(raw: string) {
  const d = digitsOnly(raw);
  if (d.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (d.startsWith("6")) return "Discover";
  return "Card";
}

/**
 * Live visual of the card as the customer types — paired with payment inputs.
 */
export function PaymentCardPreview({
  name,
  number,
  exp,
  cvv,
  showBack = false,
  className,
}: Props) {
  const brand = brandFromNumber(number);
  const displayName = name.trim() || "YOUR NAME";
  const displayExp = exp.trim() || "MM/YY";

  return (
    <div className={cn("w-full", className)}>
      <div className="relative mx-auto h-[200px] w-full max-w-[340px] [perspective:1000px]">
        <div
          className={cn(
            "relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]",
            showBack && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Front */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#152a45] to-[#0f766e] p-5 text-white shadow-[0_20px_40px_rgba(10,22,40,0.35)] [backface-visibility:hidden]">
            <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 left-8 h-32 w-32 rounded-full bg-[#E8C547]/20 blur-2xl" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                {/* Modern EMV chip + contactless */}
                <div className="flex items-center gap-2.5">
                  <svg
                    viewBox="0 0 50 38"
                    className="h-9 w-[46px] shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient
                        id="chipFace"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#fff6df" />
                        <stop offset="35%" stopColor="#e8c872" />
                        <stop offset="70%" stopColor="#c9a227" />
                        <stop offset="100%" stopColor="#8f7010" />
                      </linearGradient>
                      <linearGradient
                        id="chipSheen"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
                        <stop offset="50%" stopColor="#fff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <rect
                      x="1"
                      y="1"
                      width="48"
                      height="36"
                      rx="6"
                      fill="url(#chipFace)"
                      stroke="#7a5f12"
                      strokeWidth="1"
                    />
                    <rect
                      x="1"
                      y="1"
                      width="48"
                      height="36"
                      rx="6"
                      fill="url(#chipSheen)"
                    />
                    {/* Horizontal contact rows */}
                    <g
                      fill="none"
                      stroke="#5c4810"
                      strokeWidth="1.15"
                      opacity="0.75"
                    >
                      <rect x="7" y="7" width="14" height="7" rx="1.2" />
                      <rect x="23" y="7" width="14" height="7" rx="1.2" />
                      <rect x="7" y="15.5" width="14" height="7" rx="1.2" />
                      <rect x="23" y="15.5" width="14" height="7" rx="1.2" />
                      <rect x="7" y="24" width="14" height="7" rx="1.2" />
                      <rect x="23" y="24" width="14" height="7" rx="1.2" />
                      <rect x="39" y="7" width="5" height="24" rx="1.2" />
                    </g>
                    <g stroke="#5c4810" strokeWidth="1.15" opacity="0.75">
                      <line x1="21" y1="10.5" x2="23" y2="10.5" />
                      <line x1="21" y1="19" x2="23" y2="19" />
                      <line x1="21" y1="27.5" x2="23" y2="27.5" />
                      <line x1="37" y1="10.5" x2="39" y2="10.5" />
                      <line x1="37" y1="19" x2="39" y2="19" />
                      <line x1="37" y1="27.5" x2="39" y2="27.5" />
                    </g>
                  </svg>
                  {/* Contactless waves */}
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 text-white/55"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M8 8.5c1.6 1.5 1.6 5.5 0 7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M11.2 6c2.6 2.4 2.6 9.6 0 12"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14.4 3.5c3.5 3.2 3.5 13.8 0 17"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                  {brand}
                </p>
              </div>
              <p className="whitespace-nowrap font-mono text-[1.15rem] tracking-[0.1em] sm:text-[1.25rem]">
                {formatCardNumber(number)}
              </p>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">
                    Cardholder
                  </p>
                  <p className="truncate text-sm font-semibold uppercase tracking-wide">
                    {displayName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">
                    Expires
                  </p>
                  <p className="font-mono text-sm font-semibold">{displayExp}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#152a45] to-[#0a1628] text-white shadow-[0_20px_40px_rgba(10,22,40,0.35)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="mt-6 h-10 w-full bg-black/50" />
            <div className="mt-5 px-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">
                Security code
              </p>
              <div className="mt-1.5 flex items-center justify-end rounded-md bg-white px-3 py-2">
                <span className="font-mono text-sm font-bold tracking-widest text-[#0a1628]">
                  {digitsOnly(cvv).slice(0, 4) || "•••"}
                </span>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-white/45">
                Authorize.net checkout · Phoenix Storage Yards
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-[#94a3b8]">
        Card updates as you type · CVV flips the card
      </p>
    </div>
  );
}

export function formatCardNumberInput(raw: string) {
  const d = digitsOnly(raw).slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatExpInput(raw: string) {
  const d = digitsOnly(raw).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}
