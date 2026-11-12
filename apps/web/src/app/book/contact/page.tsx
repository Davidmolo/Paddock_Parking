import Link from "next/link";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";
import {
  LOCATIONS,
  SITE_EMAIL,
  SITE_PHONE,
  SITE_PHONE_TEL,
} from "@/lib/site-content";

export default function ContactPage() {
  return (
    <BookChrome>
      <section className="bg-[#0a1628] py-16 text-white">
        <div className={BOOK_SHELL}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E8C547]">
            Contact
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-sora)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Talk to Phoenix Storage Yards
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Call, email, or book online — we&apos;ll get you into a yard fast.
          </p>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className={`${BOOK_SHELL} grid gap-10 lg:grid-cols-2`}>
          <div className="space-y-4">
            <p>
              <span className="block text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                Phone
              </span>
              <a
                href={SITE_PHONE_TEL}
                className="text-xl font-semibold text-[#0a1628]"
              >
                {SITE_PHONE}
              </a>
            </p>
            <p>
              <span className="block text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                Email
              </span>
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="text-xl font-semibold text-[#0a1628]"
              >
                {SITE_EMAIL}
              </a>
            </p>
            <Link
              href="/book/spots"
              className="inline-flex rounded-xl bg-[#E8C547] px-5 py-3 text-sm font-bold text-[#0a1628]"
            >
              Book Now
            </Link>
          </div>
          <div>
            <h2 className="font-semibold text-[#0a1628]">Yards</h2>
            <ul className="mt-4 space-y-3 text-sm text-[#64748b]">
              {LOCATIONS.map((loc) => (
                <li key={loc.name}>
                  <span className="font-semibold text-[#0a1628]">
                    {loc.name}
                  </span>
                  <br />
                  {loc.address}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </BookChrome>
  );
}
