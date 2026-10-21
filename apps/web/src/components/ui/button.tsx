"use client";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary:
    "bg-[var(--ink)] text-white hover:bg-[#1a2a3d] shadow-[0_8px_24px_rgba(15,29,46,0.25)]",
  secondary:
    "bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--border)] hover:border-[var(--accent)]",
  ghost:
    "bg-transparent text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
  danger: "bg-[#b42318] text-white hover:bg-[#912018]",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium tracking-wide transition-[colors,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
