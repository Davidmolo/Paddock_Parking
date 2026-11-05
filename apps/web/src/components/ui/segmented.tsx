"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

/**
 * Segmented control whose highlight slides to the selected item.
 * Pill for filters, underline for status rows.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  variant = "pill",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  ariaLabel: string;
  variant?: "pill" | "underline";
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const signature = options.map((option) => `${option.value}:${option.label}:${option.count ?? ""}`).join("|");

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const active = root.querySelector<HTMLElement>("[data-active='true']");
      if (!active) return;
      const next = {
        left: active.offsetLeft,
        top: active.offsetTop,
        width: active.offsetWidth,
        height: active.offsetHeight,
      };
      setBox((prev) =>
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [value, signature]);

  const pill = variant === "pill";

  return (
    <div
      ref={rootRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex max-w-full items-center",
        pill
          ? "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
          : "gap-1 border-b border-[var(--border)]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute transition-[left,width,top,height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          pill
            ? "rounded-lg bg-[var(--accent)]"
            : "-bottom-px h-[2px] rounded-full bg-[var(--ink)]",
        )}
        style={
          pill
            ? {
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                opacity: box.width ? 1 : 0,
              }
            : { left: box.left, width: box.width, opacity: box.width ? 1 : 0 }
        }
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            data-active={active}
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 whitespace-nowrap font-medium transition-colors duration-200",
              pill ? "rounded-lg px-3 py-1.5 text-[13px]" : "px-3 py-2 text-[13px]",
              active ? (pill ? "text-[var(--accent-ink)]" : "text-[var(--ink)]") : "text-[var(--muted)] hover:text-[var(--ink)]",
            )}
          >
            {option.label}
            {option.count != null && (
              <span className={cn("ml-1.5 tabular-nums", active && pill ? "text-[var(--accent-ink)]/70" : "text-[var(--muted)]")}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
