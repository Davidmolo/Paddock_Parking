"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  value: string;
  onChange: (dataUrl: string) => void;
  className?: string;
};

/** Draw signature with mouse / trackpad / finger (matches live Book Now). */
export function SignaturePad({ label, value, onChange, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const cssSize = useRef({ w: 0, h: 0 });
  /** Last data URL we pushed up — ignore echo from parent so we don't wipe strokes. */
  const lastEmitted = useRef(value);
  const hasInk = useRef(!!value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [empty, setEmpty] = useState(!value);

  function ensureCtx() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;

    const dpr = window.devicePixelRatio || 1;
    const bufW = Math.max(1, Math.floor(rect.width * dpr));
    const bufH = Math.max(1, Math.floor(rect.height * dpr));
    const needsResize =
      canvas.width !== bufW ||
      canvas.height !== bufH ||
      cssSize.current.w !== rect.width;

    if (needsResize) {
      const snapshot =
        canvas.width > 0 && hasInk.current
          ? canvas.toDataURL("image/png")
          : "";
      canvas.width = bufW;
      canvas.height = bufH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0a1628";
      ctxRef.current = ctx;
      cssSize.current = { w: rect.width, h: rect.height };
      if (snapshot && snapshot.length > 100) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = snapshot;
      }
      return ctx;
    }

    if (!ctxRef.current) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0a1628";
      ctxRef.current = ctx;
      cssSize.current = { w: rect.width, h: rect.height };
    }
    return ctxRef.current;
  }

  function drawImage(dataUrl: string) {
    const ctx = ensureCtx();
    if (!ctx) return;
    const { w, h } = cssSize.current;
    ctx.clearRect(0, 0, w, h);
    if (!dataUrl) {
      hasInk.current = false;
      setEmpty(true);
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      hasInk.current = true;
      setEmpty(false);
    };
    img.src = dataUrl;
  }

  useEffect(() => {
    ensureCtx();
    if (value) {
      lastEmitted.current = value;
      drawImage(value);
    }

    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      ensureCtx();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
    // mount only — parent value sync handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parent cleared the signature (or restored a different draft)
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    drawImage(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = ensureCtx();
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pos(e);
    lastPoint.current = p;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // Dot so a tap still registers
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
    hasInk.current = true;
    setEmpty(false);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const p = pos(e);
    const last = lastPoint.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPoint.current = p;
  }

  function commit(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    lastEmitted.current = dataUrl;
    onChangeRef.current(dataUrl);
  }

  function clear() {
    const ctx = ensureCtx();
    const { w, h } = cssSize.current;
    if (ctx) ctx.clearRect(0, 0, w, h);
    hasInk.current = false;
    setEmpty(true);
    lastEmitted.current = "";
    onChangeRef.current("");
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <p className="text-sm font-semibold text-[#0a1628]">{label}</p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[#0a1628]/20 bg-white">
        <canvas
          ref={canvasRef}
          className="h-36 w-full touch-none cursor-crosshair select-none"
          style={{ width: "100%", height: 144, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={commit}
          onPointerCancel={commit}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#94a3b8]">
          {empty
            ? "Sign with your mouse or finger on touch devices"
            : "Signature captured"}
        </p>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-semibold text-[#0a1628] underline-offset-2 hover:underline"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
