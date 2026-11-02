import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";
import { SERVICES, WHAT_WE_PARK } from "@/lib/site-content";

export default function ServicesPage() {
  return (
    <BookChrome>
      <section className="bg-[#0a1628] py-16 text-white">
        <div className={BOOK_SHELL}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#f5b301]">
            Services
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-sora)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Storage built for contractors & fleets
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            From heavy equipment to acre yards — same gated security, live
            cameras, and month-to-month flexibility across Phoenix.
          </p>
          <Link
            href="/book/spots"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#f5b301] px-5 py-3 text-sm font-bold text-[#0a1628]"
          >
            Book Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className={`${BOOK_SHELL} space-y-10`}>
          {SERVICES.map((s) => (
            <article
              key={s.slug}
              id={s.slug}
              className="scroll-mt-24 rounded-2xl border border-[#e8ecf0] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-[#0a1628]">
                  {s.title}
                </h2>
                {"popular" in s && s.popular ? (
                  <span className="rounded-full bg-[#f5b301]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0a1628]">
                    Most Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-3 max-w-2xl text-[#64748b]">{s.blurb}</p>
              <Link
                href="/book/spots"
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#0a1628]"
              >
                Check availability <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#eef1f4] py-16">
        <div className={BOOK_SHELL}>
          <h2 className="text-2xl font-semibold text-[#0a1628]">
            What we park
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_WE_PARK.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#e8ecf0] bg-white p-5"
              >
                <h3 className="font-semibold text-[#0a1628]">{item.title}</h3>
                <p className="mt-2 text-sm text-[#64748b]">{item.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </BookChrome>
  );
}
