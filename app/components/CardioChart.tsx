"use client";

import { useState } from "react";
import type { CardioEventPoint } from "@/lib/progress";
import { formatPace } from "@/lib/units";

const WIDTH = 640;
const HEIGHT = 260;
const PADDING = 12;
const LEFT_PADDING = 46; // room for the distance axis labels
const RIGHT_PADDING = 50; // room for the pace axis labels
const TOP_PADDING = 16;
const BOTTOM_PADDING = 36;
const MS_PER_DAY = 86_400_000;

const axisLabel = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

/** Least-squares line of best fit over days-since-first-point vs the given metric. */
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sumXX = xs.reduce((sum, x) => sum + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Run/bike history chart, toggled between the two with a pill. Distance
 * (the session-to-session "volume") reads off the left axis as a connected
 * line; pace reads off the right axis as individual points, since pace only
 * exists for sessions that logged a duration — a trend line is drawn through
 * each series independently against its own axis.
 */
export default function CardioChart({ runs, bikes }: { runs: CardioEventPoint[]; bikes: CardioEventPoint[] }) {
  const [mode, setMode] = useState<"RUN" | "BIKE">("RUN");
  const points = mode === "RUN" ? runs : bikes;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {(["RUN", "BIKE"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-full text-sm font-extrabold transition active:scale-95 ${
              m === mode ? "bg-theme-accent text-theme-own" : "bg-theme-accent/10 hover:bg-theme-accent/20"
            }`}
          >
            {m === "RUN" ? "Run" : "Bike"}
          </button>
        ))}
      </div>
      <ChartBody points={points} />
    </div>
  );
}

function ChartBody({ points }: { points: CardioEventPoint[] }) {
  if (points.length < 2) {
    return <div className="h-[220px] flex items-center justify-center text-sm opacity-60">Log at least two sessions to see the trend.</div>;
  }

  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const minDate = sorted[0].date.getTime();
  const maxDate = sorted[sorted.length - 1].date.getTime();
  const dateRange = maxDate - minDate || 1;

  const chartBottom = HEIGHT - BOTTOM_PADDING;
  const toX = (t: number) => LEFT_PADDING + ((t - minDate) / dateRange) * (WIDTH - LEFT_PADDING - RIGHT_PADDING - PADDING);
  const daysSinceStart = (t: number) => (t - minDate) / MS_PER_DAY;

  // Distance — left axis, connected line, one point per session.
  const distances = sorted.map((p) => p.distanceKm);
  const maxDist = Math.max(...distances) * 1.1 || 1;
  const toYDist = (d: number) => chartBottom - (d / maxDist) * (chartBottom - TOP_PADDING);
  const distXs = sorted.map((p) => daysSinceStart(p.date.getTime()));
  const distTrend = linearRegression(distXs, distances);
  const distPath = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.date.getTime()).toFixed(1)} ${toYDist(p.distanceKm).toFixed(1)}`).join(" ");
  const distTrendPath = `M ${toX(minDate).toFixed(1)} ${toYDist(distTrend.intercept).toFixed(1)} L ${toX(maxDate).toFixed(1)} ${toYDist(
    distTrend.intercept + distTrend.slope * distXs[distXs.length - 1]
  ).toFixed(1)}`;

  // Pace — right axis, one point per session that logged a duration (no connecting line), plus its own trend line.
  const paced = sorted.filter((p): p is CardioEventPoint & { paceMinPerKm: number } => p.paceMinPerKm != null);
  const hasPace = paced.length >= 2;
  const paces = paced.map((p) => p.paceMinPerKm);
  const minPace = hasPace ? Math.min(...paces) * 0.95 : 0;
  const maxPace = hasPace ? Math.max(...paces) * 1.05 : 1;
  const paceRange = maxPace - minPace || 1;
  const toYPace = (p: number) => chartBottom - ((p - minPace) / paceRange) * (chartBottom - TOP_PADDING);
  let paceTrendPath = "";
  if (hasPace) {
    const paceXs = paced.map((p) => daysSinceStart(p.date.getTime()));
    const paceTrend = linearRegression(paceXs, paces);
    const startY = toYPace(paceTrend.intercept + paceTrend.slope * paceXs[0]);
    const endY = toYPace(paceTrend.intercept + paceTrend.slope * paceXs[paceXs.length - 1]);
    paceTrendPath = `M ${toX(paced[0].date.getTime()).toFixed(1)} ${startY.toFixed(1)} L ${toX(paced[paced.length - 1].date.getTime()).toFixed(
      1
    )} ${endY.toFixed(1)}`;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-[260px] text-theme-accent">
        <line x1={LEFT_PADDING} y1={TOP_PADDING} x2={LEFT_PADDING} y2={chartBottom} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
        <line
          x1={WIDTH - RIGHT_PADDING}
          y1={TOP_PADDING}
          x2={WIDTH - RIGHT_PADDING}
          y2={chartBottom}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />
        <line x1={LEFT_PADDING} y1={chartBottom} x2={WIDTH - RIGHT_PADDING} y2={chartBottom} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />

        <path d={distTrendPath} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.35} />
        <path d={distPath} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.9} />
        {sorted.map((p, i) => (
          <circle key={`d-${i}`} cx={toX(p.date.getTime())} cy={toYDist(p.distanceKm)} r={3} fill="currentColor" opacity={0.9} />
        ))}

        {hasPace && (
          <>
            <path d={paceTrendPath} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="2 4" opacity={0.45} />
            {paced.map((p, i) => (
              <circle key={`p-${i}`} cx={toX(p.date.getTime())} cy={toYPace(p.paceMinPerKm)} r={4} fill="none" stroke="currentColor" strokeWidth={2} />
            ))}
          </>
        )}

        <text x={LEFT_PADDING - 6} y={toYDist(maxDist) + 4} fontSize={11} fill="currentColor" opacity={0.6} textAnchor="end">
          {maxDist.toFixed(1)}km
        </text>
        <text x={LEFT_PADDING - 6} y={chartBottom + 4} fontSize={11} fill="currentColor" opacity={0.6} textAnchor="end">
          0km
        </text>

        {hasPace && (
          <>
            <text x={WIDTH - RIGHT_PADDING + 6} y={toYPace(maxPace) + 4} fontSize={11} fill="currentColor" opacity={0.6}>
              {formatPace(maxPace)}
            </text>
            <text x={WIDTH - RIGHT_PADDING + 6} y={toYPace(minPace) + 4} fontSize={11} fill="currentColor" opacity={0.6}>
              {formatPace(minPace)}
            </text>
          </>
        )}

        <text x={LEFT_PADDING} y={HEIGHT - 12} fontSize={11} fill="currentColor" opacity={0.6}>
          {axisLabel(sorted[0].date)}
        </text>
        <text x={WIDTH - RIGHT_PADDING} y={HEIGHT - 12} fontSize={11} fill="currentColor" opacity={0.6} textAnchor="end">
          {axisLabel(sorted[sorted.length - 1].date)}
        </text>
      </svg>

      <div className="flex items-center gap-4 mt-2 text-xs font-bold opacity-60">
        <span>— Distance (left)</span>
        <span>○ Pace (right)</span>
        <span className="opacity-70">┄ trend</span>
      </div>
    </div>
  );
}
