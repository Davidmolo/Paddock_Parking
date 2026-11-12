import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";

export default function AboutPage() {
  return (
    <BookChrome>
      <section className="bg-[#0a1628] py-16 text-white">
        <div className={BOOK_SHELL}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E8C547]">
            About Us
          </p>
          <h1 className="mt-2 max-w-3xl font-[family-name:var(--font-sora)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Outdoor storage yards built for Phoenix contractors
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Since 2022 we&apos;ve run gated yards across Phoenix for heavy
            equipment, fleets, and contractor staging — with live cameras, true
            24/7 access, and a zero-theft track record.
          </p>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className={`${BOOK_SHELL} max-w-3xl space-y-6 text-[#64748b]`}>
          <p>
            Phoenix Storage Yards is more than a parking lot. Our yards are designed
            for commercial assets: wide lanes, perimeter security, automated
            gates, and the ability to check your equipment from your phone.
          </p>
          <p>
            Lease by the spot or by the acre, month-to-month. Book online, sign
            digitally, and get into Onboarding with our ops team — all inside
            this product.
          </p>
          <Link
            href="/book/spots"
            className="inline-flex items-center gap-2 rounded-xl bg-[#E8C547] px-5 py-3 text-sm font-bold text-[#0a1628]"
          >
            Book Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </BookChrome>
  );
}
