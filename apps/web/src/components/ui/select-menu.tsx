"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectMenuOption = { value: string; label: string };

type MenuPos = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

function measure(trigger: HTMLElement): MenuPos | null {
  const rect = trigger.getBoundingClientRect();
  if (rect.bottom < 40 || rect.top > window.innerHeight - 8) return null;
  const gap = 6;
  const below = window.innerHeight - rect.bottom - gap - 8;
  const above = rect.top - gap - 8;
  const openUp = below < 180 && above > below;
  const maxHeight = Math.max(140, Math.min(300, openUp ? above : below));
  const width = Math.max(rect.width, 200);
  let left = rect.left;
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - 8 - width);
  }
  if (openUp) {
    return {
      bottom: window.innerHeight - rect.top + gap,
      left,
      width,
      maxHeight,
    };
  }
  return { top: rect.bottom + gap, left, width, maxHeight };
}

const sizes = {
  sm: "h-8 px-2 text-xs",
  md: "h-10 px-3 text-sm",
  lg: "h-11 px-3.5 text-sm",
};

export function SelectMenu({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = "Select…",
  disabled,
  className,
  size = "md",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: keyof typeof sizes;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  const [motionOn, setMotionOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const next = measure(trigger);
      if (!next) {
        setOpen(false);
        return;
      }
      setPos((current) => {
        if (
          current &&
          current.top === next.top &&
          current.bottom === next.bottom &&
          current.left === next.left &&
          current.width === next.width &&
          current.maxHeight === next.maxHeight
        ) {
          return current;
        }
        return next;
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    function onWheel(event: WheelEvent) {
      const el = listRef.current;
      if (!el) return;
      event.stopPropagation();
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) {
        event.preventDefault();
        return;
      }
      const next = el.scrollTop + event.deltaY;
      if (next <= 0 || next >= max) event.preventDefault();
    }
    list.addEventListener("wheel", onWheel, { passive: false });
    return () => list.removeEventListener("wheel", onWheel);
  }, [open, filtered.length]);

  useEffect(() => {
    const index = filtered.findIndex((option) => option.value === value);
    setActive(index >= 0 ? index : 0);
  }, [query, open, value, filtered]);

  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const item = list?.querySelectorAll<HTMLButtonElement>("[data-option]")[active];
    if (!list || !item) {
      setBox(null);
      return;
    }
    const next = { top: item.offsetTop, height: item.offsetHeight };
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
    if (!motionOn) {
      setBox((prev) =>
        prev && prev.top === next.top && prev.height === next.height ? prev : next,
      );
      setMotionOn(true);
      return;
    }
    const frame = requestAnimationFrame(() => {
      setBox((prev) =>
        prev && prev.top === next.top && prev.height === next.height ? prev : next,
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [active, filtered, open, motionOn]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(filtered.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[active];
      if (option) choose(option.value);
    }
  }

  function toggle() {
    if (disabled) return;
    setOpen((current) => {
      if (current) return false;
      setQuery("");
      setMotionOn(false);
      return true;
    });
  }

  const menu =
    open && pos && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={`${id}-menu`}
            role="listbox"
            aria-label={ariaLabel}
            className="menu-in fixed z-[80] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_40px_rgba(10,22,40,0.16)]"
            style={{
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
          >
            <div className="border-b border-[var(--border)] p-1.5">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setMotionOn(false);
                  }}
                  onKeyDown={onSearchKey}
                  placeholder="Search"
                  aria-label={`Search ${ariaLabel}`}
                  className="h-8 w-full rounded-lg bg-[var(--surface-muted)] pl-8 pr-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--accent)]"
                />
              </label>
            </div>
            <div
              ref={listRef}
              className="relative overflow-y-auto overscroll-contain p-1"
              style={{ maxHeight: Math.max(80, pos.maxHeight - 52) }}
            >
              {box && filtered.length > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1 right-1 rounded-lg bg-[var(--accent-soft)]"
                  style={{
                    top: box.top,
                    height: box.height,
                    transition: motionOn
                      ? "top 160ms cubic-bezier(0.22,1,0.36,1), height 160ms cubic-bezier(0.22,1,0.36,1)"
                      : "none",
                  }}
                />
              )}
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                  No matches
                </p>
              ) : (
                filtered.map((option, index) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      data-option
                      aria-selected={isSelected}
                      style={{ animationDelay: `${Math.min(index, 8) * 16}ms` }}
                      className={cn(
                        "menu-item relative flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[var(--ink)]",
                        index === active && "text-[var(--ink)]",
                      )}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(option.value)}
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-[var(--ink)] transition-opacity duration-150",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 truncate">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!open) toggle();
          }
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left text-[var(--ink)] outline-none transition-[border-color,box-shadow] duration-150",
          "focus-visible:border-[var(--accent)] focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]",
          open && "border-[var(--accent)] ring-4 ring-[var(--accent-soft)]",
          "disabled:opacity-50",
          sizes[size],
          className,
        )}
      >
        <span className={cn("min-w-0 truncate", !selected && "text-[var(--muted)]")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {menu}
    </>
  );
}
