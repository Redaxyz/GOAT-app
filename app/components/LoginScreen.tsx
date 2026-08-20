"use client";

import { useRef, useState, useTransition } from "react";
import { selectProfile } from "@/app/actions";
import { JACK_BLUE, REDA_GOLD } from "@/lib/theme";

const TEETH = 18;
const DEPTH = 1.6;
const FAR = 110;
const GROW_MS = 550;
const REVEAL_MS = 650;

type Side = "left" | "right";
type Phase = "idle" | "grow" | "reveal";

const PANEL: Record<Side, { bg: string; text: string; name: string }> = {
  left: { bg: JACK_BLUE, text: REDA_GOLD, name: "Jack" },
  right: { bg: REDA_GOLD, text: JACK_BLUE, name: "Reda" },
};

/** Maps a local coordinate (0 = this side's screen edge, 100 = the far screen edge) to a real x%. */
function toX(u: number, side: Side) {
  return side === "left" ? u : 100 - u;
}

/** Teeth oscillate around a real x% (not local/side coordinates) so both panels share one boundary curve. */
function teethX(cx: number): number[] {
  const xs: number[] = [];
  for (let i = 0; i <= TEETH; i++) {
    xs.push(cx + (i % 2 === 0 ? DEPTH : -DEPTH));
  }
  return xs;
}

/** Clip path for a panel spanning [jaggedU, straightU] in local coordinates, jagged edge at jaggedU. */
function clipPath(jaggedU: number, straightU: number, side: Side) {
  const xs = teethX(toX(jaggedU, side));
  const straightX = toX(straightU, side);
  const path = [`${straightX}% 0%`];
  xs.forEach((x, i) => path.push(`${x}% ${(i / TEETH) * 100}%`));
  path.push(`${straightX}% 100%`);
  return `polygon(${path.join(",")})`;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function useTweener() {
  const rafRef = useRef<number | null>(null);
  const run = (from: number, to: number, duration: number, onUpdate: (v: number) => void, onDone?: () => void) => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      onUpdate(from + (to - from) * easeInOutCubic(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };
  return { run };
}

function NameLabel({ side, x }: { side: Side; x: number }) {
  return (
    <span
      className="absolute top-1/2 font-extrabold whitespace-nowrap"
      style={{
        left: `${x}%`,
        transform: "translate(-50%, -50%)",
        color: PANEL[side].text,
        fontSize: "clamp(2.5rem, 8vw, 6rem)",
      }}
    >
      {PANEL[side].name}
    </span>
  );
}

export default function LoginScreen({ initialShow }: { initialShow: boolean }) {
  const [visible, setVisible] = useState(initialShow);
  const [phase, setPhase] = useState<Phase>("idle");
  const [side, setSide] = useState<Side | null>(null);
  const [growEdge, setGrowEdge] = useState(50);
  const [revealEdge, setRevealEdge] = useState(0);
  const [, startTransition] = useTransition();
  const grow = useTweener();
  const reveal = useTweener();

  if (!visible) return null;

  function pick(chosen: Side) {
    if (phase !== "idle") return;
    setSide(chosen);
    setPhase("grow");
    grow.run(50, 100, GROW_MS, setGrowEdge, () => {
      setPhase("reveal");
      startTransition(() => {
        selectProfile(chosen === "left" ? "FRIEND" : "ME");
      });
      reveal.run(0, FAR, REVEAL_MS, setRevealEdge, () => {
        setVisible(false);
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {(["left", "right"] as Side[]).map((s) => {
        const isPicked = side === s;
        if (phase === "reveal" && !isPicked) return null;
        const revealing = phase === "reveal" && isPicked;
        const edge = isPicked ? (phase === "reveal" ? revealEdge : growEdge) : 50;
        const straightEdge = revealing ? FAR : 0;
        // Name position tracks the visible on-screen midpoint, not the raw clip
        // extent — straightEdge overshoots past the 100% viewport edge as a clip
        // buffer, and using it directly here would jump the name off-center.
        const nameMidpoint = (edge + Math.min(straightEdge, 100)) / 2;
        const interactive = phase === "idle";
        return (
          <button
            key={s}
            type="button"
            aria-label={`Continue as ${PANEL[s].name}`}
            onClick={() => pick(s)}
            disabled={!interactive}
            className="absolute inset-0 h-full w-full"
            style={{
              clipPath: clipPath(edge, straightEdge, s),
              background: PANEL[s].bg,
              zIndex: isPicked ? 2 : 1,
              cursor: interactive ? "pointer" : "default",
              pointerEvents: phase === "reveal" ? "none" : undefined,
              transition: "filter 150ms ease",
            }}
          >
            <NameLabel side={s} x={toX(nameMidpoint, s)} />
          </button>
        );
      })}
    </div>
  );
}
