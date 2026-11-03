import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";
import { LOCATIONS, SITE_PHONE, SITE_PHONE_TEL } from "@/lib/site-content";

export default function LocationsPage() {
  return (
    <BookChrome>
      <section className="bg-[#0a1628] py-16 text-white">
        <div className={BOOK_SHELL}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E8C547]">
            Locations
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-sora)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Three Phoenix yards
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Paddock 16, Paddock 325, and Paddock 6060 — named by address. Browse
            live inventory counts online (no yard layouts on the public site).
          </p>
          <Link
            href="/book/spots"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#E8C547] px-5 py-3 text-sm font-bold text-[#0a1628]"
          >
            Find Your Spot <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className={`${BOOK_SHELL} grid gap-4 md:grid-cols-3`}>
          {LOCATIONS.map((loc) => (
            <article
              key={loc.name}
              className="rounded-2xl border border-[#e8ecf0] p-6"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#E8C547]/15 text-[#0a1628]">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[#0a1628]">
                    {loc.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#64748b]">{loc.address}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#E8C547]">
                    24/7 Access
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                    <a href={SITE_PHONE_TEL} className="text-[#0a1628]">
                      {SITE_PHONE}
                    </a>
                    <a
                      href={loc.maps}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#64748b] underline-offset-2 hover:underline"
                    >
                      Get Directions
                    </a>
                    <Link
                      href={`/book/${loc.id}`}
                      className="text-[#0a1628]"
                    >
                      Book →
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </BookChrome>
  );
}
