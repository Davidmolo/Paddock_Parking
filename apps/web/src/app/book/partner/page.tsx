import Link from "next/link";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";
import { SITE_EMAIL } from "@/lib/site-content";

export default function PartnerPage() {
  return (
    <BookChrome>
      <section className="bg-[#0a1628] py-16 text-white">
        <div className={BOOK_SHELL}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E8C547]">
            Partner With Us
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-sora)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Landowners & operators
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Have land or a yard that could work as secure outdoor storage?
            Partner with Paddock Parking to put it to work.
          </p>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className={`${BOOK_SHELL} max-w-xl`}>
          <p className="text-[#64748b]">
            Email us with your property details and we&apos;ll follow up.
          </p>
          <a
            href={`mailto:${SITE_EMAIL}?subject=Partner%20With%20Us`}
            className="mt-6 inline-flex rounded-xl bg-[#E8C547] px-5 py-3 text-sm font-bold text-[#0a1628]"
          >
            Email {SITE_EMAIL}
          </a>
          <p className="mt-8 text-sm text-[#64748b]">
            Looking to store equipment instead?{" "}
            <Link href="/book/spots" className="font-semibold text-[#0a1628] underline">
              Book a spot
            </Link>
            .
          </p>
        </div>
      </section>
    </BookChrome>
  );
}
