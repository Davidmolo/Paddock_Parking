"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Phone, Star } from "lucide-react";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";
import {
  FAQS,
  LOCATIONS,
  PRICING_TIERS,
  REVIEWS,
  SITE_PHONE,
  SITE_PHONE_TEL,
  WHAT_WE_PARK,
} from "@/lib/site-content";
import { cn } from "@/lib/utils";

/** Public marketing home — mirrors paddockparking.com (not the staff admin). */
export function MarketingHome() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <BookChrome>
      <section className="relative overflow-hidden bg-[#0a1628] text-white">
        {/* Yard photo plane like live site */}
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://paddockparking.com/og-image.jpg)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628] via-[#0a1628]/92 to-[#0a1628]/55" />
        <div className="absolute inset-0 bg-[#0a1628]/35" />

        <div
          className={`${BOOK_SHELL} relative grid gap-10 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24`}
        >
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#f5b301]/40 bg-[#f5b301]/10 px-3 py-1 text-xs font-semibold text-[#f5b301]">
                Watch Your Equipment 24/7
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/90">
                Zero Theft Since 2022
              </span>
            </div>
            <h1 className="mt-6 font-[family-name:var(--font-sora)] text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
              Secure Outdoor Storage Yard &{" "}
              <span className="text-[#f5b301]">Outdoor Parking</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              Gated outdoor storage in Phoenix for trucks, trailers, heavy
              equipment, and more. Flexible month-to-month leasing. 2,200+
              contractors trust us — with live camera access to their equipment
              24/7.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-white/70">
              {[
                "Heavy Equipment",
                "Trucks & Trailers",
                "Outdoor Storage",
                "Live Cameras",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#f5b301]" />
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/book/spots"
                className="inline-flex items-center gap-2 rounded-xl bg-[#f5b301] px-6 py-3.5 text-sm font-bold text-[#0a1628]"
              >
                Book Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={SITE_PHONE_TEL}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-black/20 px-6 py-3.5 text-sm font-bold text-white backdrop-blur"
              >
                <Phone className="h-4 w-4" />
                {SITE_PHONE}
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Gated & Secure",
                "#1 in Phoenix",
                "24/7 Access",
                "No Contracts",
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <div className="relative overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
              <div
                className="aspect-[4/3] bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url(https://paddockparking.com/og-image.jpg)",
                }}
              />
              <div className="absolute inset-x-3 top-3 grid grid-cols-3 gap-2">
                {[
                  { n: "7+", l: "Years Exp." },
                  { n: "0", l: "Thefts" },
                  { n: "2.2K+", l: "Clients" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-xl bg-white/95 px-2 py-3 text-center shadow"
                  >
                    <p className="text-lg font-bold text-[#0a1628] sm:text-xl">
                      {s.n}
                    </p>
                    <p className="text-[10px] font-medium text-[#64748b]">
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <blockquote className="rounded-2xl border border-white/10 bg-[#132033]/95 p-5 backdrop-blur">
              <div className="mb-2 flex gap-0.5 text-[#f5b301]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-white/90">
                &ldquo;Got my excavator stored same day. These guys know what
                they&apos;re doing!&rdquo;
              </p>
              <p className="mt-2 text-xs font-semibold text-white/50">
                — Mike R., Owner-Operator
              </p>
            </blockquote>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className={BOOK_SHELL}>
          <h2 className="font-[family-name:var(--font-sora)] text-3xl font-semibold text-[#0a1628]">
            What Our Customers Say
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((r) => (
              <article
                key={r.name}
                className="rounded-2xl border border-[#e8ecf0] bg-[#f8fafc] p-5"
              >
                <div className="mb-3 flex gap-0.5 text-[#f5b301]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <h3 className="font-semibold text-[#0a1628]">{r.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                  {r.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#eef1f4] py-16">
        <div className={BOOK_SHELL}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#f5b301]">
            Phoenix&apos;s Most Trusted Storage Yard
          </p>
          <h2 className="mt-2 max-w-2xl font-[family-name:var(--font-sora)] text-3xl font-semibold text-[#0a1628]">
            Why Contractors Switch to Paddock Parking
          </h2>
          <p className="mt-4 max-w-2xl text-[#64748b]">
            Most storage yards give you a gate code and a prayer. We give you
            something different: the ability to see your equipment right now.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                t: "Live Camera Feeds",
                d: "Not recordings. Live video of your equipment, accessible from your phone 24/7.",
              },
              {
                t: "Zero Theft Track Record",
                d: "Since 2022, not one piece of equipment has been stolen. That's the stat that matters.",
              },
              {
                t: "True 24/7 Access",
                d: "Your access code works every hour of every day. 3am emergency? No problem.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="rounded-2xl border border-[#e8ecf0] bg-white p-6"
              >
                <h3 className="font-semibold text-[#0a1628]">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                  {c.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className={BOOK_SHELL}>
          <h2 className="font-[family-name:var(--font-sora)] text-3xl font-semibold text-[#0a1628]">
            If It Has Wheels (Or Tracks), We Park It
          </h2>
          <p className="mt-3 max-w-2xl text-[#64748b]">
            From $500K excavators to box trailers. If you need it protected and
            accessible 24/7, we handle it.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_WE_PARK.map((item) => (
              <Link
                key={item.title}
                href="/book/services"
                className="group rounded-2xl border border-[#e8ecf0] bg-[#f8fafc] p-6 transition hover:border-[#f5b301]"
              >
                <h3 className="font-semibold text-[#0a1628]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                  {item.blurb}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0a1628]">
                  Learn More <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#eef1f4] py-16">
        <div className={BOOK_SHELL}>
          <h2 className="font-[family-name:var(--font-sora)] text-3xl font-semibold text-[#0a1628]">
            Flexible Storage Solutions
          </h2>
          <p className="mt-3 text-[#64748b]">
            Choose the contractor yard or storage solution that fits your
            business needs. No hidden fees.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.title}
                className="flex flex-col rounded-2xl border border-[#e8ecf0] bg-white p-6"
              >
                <h3 className="font-semibold text-[#0a1628]">{tier.title}</h3>
                <p className="mt-1 text-sm text-[#64748b]">{tier.size}</p>
                {tier.price ? (
                  <p className="mt-3 text-2xl font-bold text-[#0a1628]">
                    {tier.price}
                  </p>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-[#f5b301]">
                    Custom quote
                  </p>
                )}
                <ul className="mt-4 flex-1 space-y-2 text-sm text-[#64748b]">
                  {tier.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#f5b301]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/book/spots"
                  className="mt-6 inline-flex justify-center rounded-xl bg-[#0a1628] px-4 py-2.5 text-sm font-bold text-white"
                >
                  Book Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className={BOOK_SHELL}>
          <h2 className="font-[family-name:var(--font-sora)] text-3xl font-semibold text-[#0a1628]">
            Wherever Your Jobs Are, We&apos;re Close
          </h2>
          <p className="mt-3 text-[#64748b]">
            Paddock 16, Paddock 325, and Paddock 6060 — stop driving across town.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LOCATIONS.map((loc) => (
              <article
                key={loc.id}
                className="rounded-2xl border border-[#e8ecf0] p-6"
              >
                <h3 className="font-semibold text-[#0a1628]">{loc.name}</h3>
                <p className="mt-2 text-sm text-[#64748b]">{loc.address}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#f5b301]">
                  24/7 Access
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
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
                  <Link href={`/book/${loc.id}`} className="text-[#0a1628]">
                    Book →
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/book/spots"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f5b301] px-5 py-3 text-sm font-bold text-[#0a1628]"
            >
              See live availability <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#eef1f4] py-16">
        <div className={`${BOOK_SHELL} max-w-3xl`}>
          <h2 className="font-[family-name:var(--font-sora)] text-3xl font-semibold text-[#0a1628]">
            Common Questions
          </h2>
          <p className="mt-3 text-[#64748b]">
            Quick answers about our storage yards, pricing, and how to get
            started.
          </p>
          <div className="mt-8 space-y-2">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-xl border border-[#e8ecf0] bg-white"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-[#0a1628]"
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    {faq.q}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  {open ? (
                    <p className="border-t border-[#e8ecf0] px-5 py-4 text-sm leading-relaxed text-[#64748b]">
                      {faq.a}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/book/spots"
              className="inline-flex rounded-xl bg-[#f5b301] px-5 py-3 text-sm font-bold text-[#0a1628]"
            >
              Get a Quote / Book Now
            </Link>
            <a
              href={SITE_PHONE_TEL}
              className="inline-flex items-center gap-2 rounded-xl border border-[#0a1628]/15 px-5 py-3 text-sm font-bold text-[#0a1628]"
            >
              Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>
    </BookChrome>
  );
}
