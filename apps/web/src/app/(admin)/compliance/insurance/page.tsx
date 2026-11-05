"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Merged into Customers → Compliance (David Oct 27). */
export default function InsuranceRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/customers/compliance");
  }, [router]);
  return null;
}
