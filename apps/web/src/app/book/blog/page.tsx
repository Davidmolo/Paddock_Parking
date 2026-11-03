import Link from "next/link";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";

const POSTS = [
  {
    title: "Why contractors choose gated outdoor yards over mini-storage",
    blurb:
      "Wide lanes, 24/7 access, and room for excavators — what a real contractor yard needs.",
  },
  {
    title: "Lease by the acre vs by the spot in Phoenix",
    blurb:
      "When a single stall is enough, and when staging gear needs a half-acre or more.",
  },
  {
    title: "Live cameras and zero theft: how we think about security",
    blurb:
      "Gate codes alone aren't enough. See how live visibility changes the game.",
  },
] as const;

export default function BlogPage() {
  return (
    <BookChrome>
      <section className="bg-[#0a1628] py-16 text-white">
        <div className={BOOK_SHELL}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E8C547]">
            Blog
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-sora)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Insights for Phoenix fleets & contractors
          </h1>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className={`${BOOK_SHELL} grid gap-4 md:grid-cols-3`}>
          {POSTS.map((post) => (
            <article
              key={post.title}
              className="rounded-2xl border border-[#e8ecf0] p-6"
            >
              <h2 className="font-semibold text-[#0a1628]">{post.title}</h2>
              <p className="mt-2 text-sm text-[#64748b]">{post.blurb}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                Coming soon
              </p>
            </article>
          ))}
        </div>
        <div className={`${BOOK_SHELL} mt-10`}>
          <Link
            href="/book/spots"
            className="inline-flex rounded-xl bg-[#E8C547] px-5 py-3 text-sm font-bold text-[#0a1628]"
          >
            Book a yard
          </Link>
        </div>
      </section>
    </BookChrome>
  );
}
