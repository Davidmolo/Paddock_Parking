"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  OrbitControls,
  RoundedBox,
  Text,
} from "@react-three/drei";
import { MOUSE, TOUCH, Vector3 } from "three";
import type { Lot, LotStatus } from "@/lib/api";
import {
  colorForAcres,
  effectiveAcres,
  layoutYardPlan,
  STATUS_COLORS,
  type LotFootprint,
  type YardFeature,
} from "@/lib/lot-layout";
import { formatCurrency } from "@/lib/utils";

type Props = {
  lots: Lot[];
  selectedId: string | null;
  onSelect: (lot: Lot) => void;
  statusFilter: LotStatus | "all";
  acreFilter: string;
  colorMode: "acres" | "status";
};

function matchesFilters(
  lot: Lot,
  statusFilter: LotStatus | "all",
  acreFilter: string,
) {
  if (statusFilter !== "all" && lot.status !== statusFilter) return false;
  if (acreFilter !== "all") {
    const acres = effectiveAcres(lot);
    if (acreFilter === "stall") {
      if (lot.lotType === "acre" || (lot.acres != null && lot.acres >= 0.25)) {
        return false;
      }
    } else if (Math.abs(acres - Number(acreFilter)) > 0.01) {
      return false;
    }
  }
  return true;
}

function YardFeatures({ features }: { features: YardFeature[] }) {
  return (
    <group>
      {features.map((f) => {
        if (f.kind === "asphalt") {
          return (
            <mesh
              key={f.id}
              position={[f.x, 0.01, f.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[f.w, f.d]} />
              <meshStandardMaterial color="#9aa3a8" roughness={0.95} />
            </mesh>
          );
        }
        if (f.kind === "drive") {
          return (
            <mesh
              key={f.id}
              position={[f.x, 0.03, f.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[f.w, f.d]} />
              <meshStandardMaterial color="#6b7280" roughness={0.9} />
            </mesh>
          );
        }
        if (f.kind === "fence") {
          return (
            <mesh key={f.id} position={[f.x, (f.h ?? 0.4) / 2, f.z]} castShadow>
              <boxGeometry args={[f.w, f.h ?? 0.4, f.d]} />
              <meshStandardMaterial
                color="#475569"
                metalness={0.35}
                roughness={0.55}
              />
            </mesh>
          );
        }
        if (f.kind === "gate") {
          return (
            <mesh
              key={f.id}
              position={[f.x, (f.h ?? 0.5) / 2, f.z]}
              castShadow
            >
              <boxGeometry args={[f.w, f.h ?? 0.5, f.d]} />
              <meshStandardMaterial
                color="#0f766e"
                metalness={0.2}
                roughness={0.45}
              />
            </mesh>
          );
        }
        return null;
      })}
    </group>
  );
}

const TAP_MS = 350;
const TAP_MOVE_PX = 12;
let lastTap: { id: string; t: number } | null = null;

function LotLabel({
  lot,
  footprint,
  dimmed,
  selected,
}: {
  lot: Lot;
  footprint: LotFootprint;
  dimmed: boolean;
  selected: boolean;
}) {
  const acres = effectiveAcres(lot);
  const title =
    footprint.kind === "acre"
      ? `#${lot.number}\n${acres} ac`
      : `#${lot.number}`;
  const fontSize =
    footprint.kind === "acre"
      ? Math.min(0.62, Math.max(0.32, Math.min(footprint.w, footprint.d) * 0.24))
      : Math.min(0.34, Math.max(0.2, footprint.w * 0.38));

  /* Flat on the pad — always visible while rotating/zooming (no Billboard hide) */
  return (
    <Text
      position={[0, footprint.h / 2 + 0.03, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={fontSize}
      color={selected ? "#ecfdf5" : dimmed ? "#64748b" : "#0f172a"}
      fillOpacity={dimmed ? 0.35 : 1}
      outlineOpacity={dimmed ? 0.25 : 1}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.05}
      outlineColor={selected ? "#0f766e" : "#ffffff"}
      textAlign="center"
      lineHeight={1.12}
      maxWidth={footprint.w * 0.9}
      overflowWrap="break-word"
      depthOffset={-2}
      renderOrder={10}
      raycast={() => null}
      onSync={(troika) => {
        troika.material.depthTest = false;
        troika.material.depthWrite = false;
        troika.material.transparent = true;
      }}
    >
      {title}
    </Text>
  );
}

function LotBlock({
  lot,
  footprint,
  selected,
  dimmed,
  colorMode,
  onHover,
  onSelect,
}: {
  lot: Lot;
  footprint: LotFootprint;
  selected: boolean;
  dimmed: boolean;
  colorMode: "acres" | "status";
  onHover: (lot: Lot | null) => void;
  onSelect: (lot: Lot) => void;
}) {
  const down = useRef<{ t: number; x: number; y: number } | null>(null);
  const acres = effectiveAcres(lot);
  const color =
    colorMode === "status"
      ? STATUS_COLORS[lot.status] ?? "#64748b"
      : colorForAcres(footprint.kind === "acre" ? acres : 0.08);

  const open = () => {
    if (dimmed) return;
    lastTap = null;
    queueMicrotask(() => {
      startTransition(() => onSelect(lot));
    });
  };

  return (
    <group
      position={[footprint.x, footprint.h / 2, footprint.z]}
      /* Double-click opens sidebar — single drag is owned by OrbitControls */
      onDoubleClick={(e) => {
        e.stopPropagation();
        open();
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        /* Never stopPropagation — pan/zoom must work while on a lot */
        down.current = { t: performance.now(), x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e: ThreeEvent<PointerEvent>) => {
        if (dimmed || !down.current) return;
        const dx = e.clientX - down.current.x;
        const dy = e.clientY - down.current.y;
        const held = performance.now() - down.current.t;
        down.current = null;
        if (dx * dx + dy * dy > TAP_MOVE_PX * TAP_MOVE_PX) return;
        if (held > TAP_MS) return;
        const now = performance.now();
        if (lastTap && lastTap.id === lot.id && now - lastTap.t < TAP_MS) {
          open();
          return;
        }
        lastTap = { id: lot.id, t: now };
      }}
      onPointerOver={() => {
        if (dimmed) return;
        onHover(lot);
      }}
      onPointerOut={() => onHover(null)}
    >
      <RoundedBox
        args={[footprint.w, footprint.h, footprint.d]}
        radius={footprint.kind === "stall" ? 0.04 : 0.1}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={color}
          roughness={footprint.kind === "stall" ? 0.55 : 0.42}
          metalness={0.06}
          transparent={dimmed || selected}
          opacity={dimmed ? 0.14 : selected ? 0.96 : 1}
          emissive={selected ? color : "#000000"}
          emissiveIntensity={selected ? 0.2 : 0}
        />
      </RoundedBox>

      {footprint.kind === "stall" && !dimmed && (
        <mesh
          position={[0, footprint.h / 2 + 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => null}
        >
          <planeGeometry
            args={[Math.max(0.08, footprint.w * 0.12), footprint.d * 0.85]}
          />
          <meshBasicMaterial color="#f8fafc" transparent opacity={0.55} />
        </mesh>
      )}

      <LotLabel
        lot={lot}
        footprint={footprint}
        dimmed={dimmed}
        selected={selected}
      />

      {selected && (
        <mesh
          position={[0, -footprint.h / 2 + 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => null}
        >
          <ringGeometry
            args={[
              Math.max(footprint.w, footprint.d) * 0.52,
              Math.max(footprint.w, footprint.d) * 0.64,
              40,
            ]}
          />
          <meshBasicMaterial color="#0f766e" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

function CameraRig({
  centerX,
  centerZ,
  width,
  depth,
  resetToken,
  focus,
}: {
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  resetToken: number;
  focus: { x: number; z: number; span: number } | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null);
  const { camera, gl } = useThree();
  const span = Math.max(width, depth);
  const minDist = Math.max(2.5, span * 0.08);
  const maxDist = Math.max(50, span * 3.2);

  const goalTarget = useRef(new Vector3(centerX, 0.2, centerZ));
  const goalCam = useRef(new Vector3());
  const animating = useRef(false);

  const applyHome = useCallback(() => {
    const dist = span * 0.95 + 8;
    goalCam.current.set(
      centerX + dist * 0.42,
      dist * 0.7,
      centerZ + dist * 0.78,
    );
    goalTarget.current.set(centerX, 0.2, centerZ);
    camera.position.copy(goalCam.current);
    const c = controls.current;
    if (c) {
      c.target.copy(goalTarget.current);
      c.minDistance = minDist;
      c.maxDistance = maxDist;
      c.update();
    }
    animating.current = false;
  }, [camera, centerX, centerZ, span, minDist, maxDist]);

  const siteKey = `${centerX.toFixed(2)}:${centerZ.toFixed(2)}:${width.toFixed(1)}:${depth.toFixed(1)}`;
  useEffect(() => {
    applyHome();
  }, [applyHome, resetToken, siteKey]);

  /* Click a lot → orbit target + camera ease onto that acre so zoom/pan stay usable */
  useEffect(() => {
    if (!focus) return;
    const dist = Math.max(focus.span * 1.8, 6);
    goalTarget.current.set(focus.x, 0.25, focus.z);
    const dir = new Vector3(0.45, 0.85, 0.7).normalize();
    goalCam.current.set(
      focus.x + dir.x * dist,
      Math.max(4, dir.y * dist),
      focus.z + dir.z * dist,
    );
    animating.current = true;
  }, [focus]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || !animating.current) return;
    const t = 1 - Math.exp(-Math.min(dt, 0.05) * 7);
    c.target.lerp(goalTarget.current, t);
    camera.position.lerp(goalCam.current, t);
    c.update();
    if (
      c.target.distanceTo(goalTarget.current) < 0.04 &&
      camera.position.distanceTo(goalCam.current) < 0.08
    ) {
      animating.current = false;
    }
  });

  useEffect(() => {
    const el = gl.domElement;
    const blockPageScroll = (e: WheelEvent) => {
      e.preventDefault();
    };
    el.addEventListener("wheel", blockPageScroll, { passive: false });
    return () => el.removeEventListener("wheel", blockPageScroll);
  }, [gl]);

  /* User drag cancels auto-focus animation so controls feel immediate */
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stopAnim = () => {
      animating.current = false;
    };
    c.addEventListener("start", stopAnim);
    return () => c.removeEventListener("start", stopAnim);
  }, []);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      enableRotate
      enableZoom
      enablePan
      rotateSpeed={0.8}
      zoomSpeed={1.3}
      panSpeed={1.15}
      screenSpacePanning
      /* Left-drag / one-finger = pan map (lot 6 → lot 2). Right / two-finger rotate. */
      touches={{
        ONE: TOUCH.PAN,
        TWO: TOUCH.DOLLY_ROTATE,
      }}
      mouseButtons={{
        LEFT: MOUSE.PAN,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.ROTATE,
      }}
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI * 0.49}
      minDistance={minDist}
      maxDistance={maxDist}
      zoomToCursor
    />
  );
}

function Scene({
  lots,
  selectedId,
  onSelect,
  statusFilter,
  acreFilter,
  colorMode,
  resetToken,
  onHover,
}: Props & {
  resetToken: number;
  onHover: (lot: Lot | null) => void;
}) {
  const plan = useMemo(() => layoutYardPlan(lots), [lots]);
  const byId = useMemo(() => new Map(lots.map((l) => [l.id, l])), [lots]);
  const { bounds } = plan;

  const focus = useMemo(() => {
    if (!selectedId) return null;
    const fp = plan.footprints.find((f) => f.lotId === selectedId);
    if (!fp) return null;
    return {
      x: fp.x,
      z: fp.z,
      span: Math.max(fp.w, fp.d),
    };
  }, [plan.footprints, selectedId]);

  return (
    <>
      <color attach="background" args={["#dce6d4"]} />
      <fog attach="fog" args={["#dce6d4", 120, 280]} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#f0fdf4", "#78716c", 0.4]} />
      <directionalLight
        castShadow
        position={[22, 32, 14]}
        intensity={1.05}
        shadow-mapSize={[1536, 1536]}
        shadow-camera-far={90}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[bounds.centerX, -0.04, bounds.centerZ]}
        receiveShadow
      >
        <planeGeometry args={[bounds.width + 18, bounds.depth + 18]} />
        <meshStandardMaterial color="#c5d4b8" roughness={1} />
      </mesh>

      <YardFeatures features={plan.features} />

      {plan.footprints.map((fp) => {
        const lot = byId.get(fp.lotId);
        if (!lot) return null;
        const ok = matchesFilters(lot, statusFilter, acreFilter);
        return (
          <LotBlock
            key={lot.id}
            lot={lot}
            footprint={fp}
            selected={selectedId === lot.id}
            dimmed={!ok}
            colorMode={colorMode}
            onHover={onHover}
            onSelect={onSelect}
          />
        );
      })}

      <ContactShadows
        position={[bounds.centerX, 0.015, bounds.centerZ]}
        opacity={0.28}
        scale={Math.max(bounds.width, bounds.depth) + 10}
        blur={2.2}
        far={14}
      />

      <CameraRig {...bounds} resetToken={resetToken} focus={focus} />
    </>
  );
}

export function YardMap3D(props: Props) {
  const selected = props.lots.find((l) => l.id === props.selectedId);
  const [hovered, setHovered] = useState<Lot | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [glError, setGlError] = useState<string | null>(null);

  const planMeta = useMemo(() => layoutYardPlan(props.lots), [props.lots]);

  const onHover = useCallback((lot: Lot | null) => {
    startTransition(() => setHovered(lot));
  }, []);

  const tip = hovered ?? selected;

  if (glError) {
    return (
      <div className="grid h-[min(62vh,560px)] min-h-[420px] place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-6 text-center">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            3D map unavailable
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{glError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[#dce6d4] shadow-[0_16px_40px_rgba(11,21,36,0.08)]">
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
          One box ·{" "}
          {planMeta.totalAcres > 0
            ? `${planMeta.totalAcres} ac`
            : `${props.lots.length} lots`}{" "}
          · {planMeta.bounds.width.toFixed(0)}×
          {planMeta.bounds.depth.toFixed(0)}
        </span>
        <span className="rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
          Drag to pan · scroll zoom · right-drag rotate · double-click lot
        </span>
      </div>

      <div className="absolute right-3 top-3 z-10">
        <button
          type="button"
          onClick={() => setResetToken((n) => n + 1)}
          className="rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-white"
        >
          Reset view
        </button>
      </div>

      {tip && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-sm rounded-xl border border-teal-700/20 bg-slate-900/90 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
          <p className="text-sm font-semibold">
            #{tip.number}
            <span className="ml-2 text-xs font-medium text-teal-200">
              {tip.lotTypeLabel}
              {tip.acres != null ? ` · ${tip.acres} ac` : ""}
              {tip.size ? ` · ${tip.size}` : ""}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-slate-300">
            {tip.status} · {formatCurrency(tip.monthlyRate)}/mo ·{" "}
            {tip.customerName ?? "Unassigned"}
          </p>
        </div>
      )}

      <div
        className="relative h-[min(62vh,560px)] min-h-[420px] w-full overscroll-none"
        style={{ touchAction: "none" }}
        onWheel={(e) => e.preventDefault()}
      >
        <Canvas
          shadows
          dpr={[1, 1.5]}
          style={{ width: "100%", height: "100%", display: "block" }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            alpha: false,
          }}
          camera={{ fov: 42, near: 0.1, far: 400 }}
          onCreated={({ gl }) => {
            gl.domElement.style.touchAction = "none";
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              queueMicrotask(() =>
                setGlError("Graphics context was lost. Refresh the page."),
              );
            });
          }}
        >
          <Suspense fallback={null}>
            <Scene {...props} resetToken={resetToken} onHover={onHover} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
