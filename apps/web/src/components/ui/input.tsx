"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { text } from "@/constants/text";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  const password = type === "password";
  const field = (
    <input
      type={password && shown ? "text" : type}
      className={cn(
        "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] placeholder:text-[var(--muted)]",
        password && "pr-11",
        className,
      )}
      {...props}
    />
  );
  if (!password) return field;
  return (
    <span className="relative block">
      {field}
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        aria-label={shown ? text.portal.hidePassword : text.portal.showPassword}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </span>
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
