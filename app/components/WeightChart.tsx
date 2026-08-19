"use client";

import { useState } from "react";
import { updateWeightEntry, deleteWeightEntry } from "@/app/actions";
import SubmitButton from "@/app/components/SubmitButton";

type Point = { id: string; date: Date; weightLb: number };

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = 12;
const LEFT_PADDING = 46; // room for the y-axis weight labels, separate from the top/right margin
const TOP_PADDING = 16;
const BOTTOM_PADDING = 36;

const axisLabel = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Least-squares line of best fit over days-since-first-point vs weight. */
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

export default function WeightChart({ points }: { points: Point[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (points.length < 2) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm opacity-60">
        Log at least two weigh-ins to see your trend.
      </div>
    );
  }

  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const selected = sorted.find((p) => p.id === selectedId) ?? null;

  const minDate = sorted[0].date.getTime();
  const maxDate = sorted[sorted.length - 1].date.getTime();
  const dateRange = maxDate - minDate || 1;

  const MS_PER_DAY = 86_400_000;
  const xs = sorted.map((p) => (p.date.getTime() - minDate) / MS_PER_DAY);
  const ys = sorted.map((p) => p.weightLb);
  const { slope, intercept } = linearRegression(xs, ys);
  const trendStartY = intercept;
  const trendEndY = intercept + slope * xs[xs.length - 1];

  const minW = Math.min(...ys, trendStartY, trendEndY);
  const maxW = Math.max(...ys, trendStartY, trendEndY);
  const range = maxW - minW || 1;

  const chartBottom = HEIGHT - BOTTOM_PADDING;
  const toX = (t: number) => LEFT_PADDING + ((t - minDate) / dateRange) * (WIDTH - LEFT_PADDING - PADDING);
  const toY = (w: number) => chartBottom - ((w - minW) / range) * (chartBottom - TOP_PADDING);

  const path = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.date.getTime()).toFixed(1)} ${toY(p.weightLb).toFixed(1)}`).join(" ");
  const trendPath = `M ${toX(minDate).toFixed(1)} ${toY(trendStartY).toFixed(1)} L ${toX(maxDate).toFixed(1)} ${toY(trendEndY).toFixed(1)}`;

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-[220px] text-theme-accent">
        <line x1={LEFT_PADDING} y1={TOP_PADDING} x2={LEFT_PADDING} y2={chartBottom} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
        <line x1={LEFT_PADDING} y1={chartBottom} x2={WIDTH - PADDING} y2={chartBottom} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />

        <path d={trendPath} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.45} />
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />

        {sorted.map((p) => {
          const isSelected = p.id === selectedId;
          return (
            <g key={p.id}>
              <circle
                cx={toX(p.date.getTime())}
                cy={toY(p.weightLb)}
                r={10}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => setSelectedId(isSelected ? null : p.id)}
              />
              <circle
                cx={toX(p.date.getTime())}
                cy={toY(p.weightLb)}
                r={isSelected ? 5 : 3}
                fill="currentColor"
                className="pointer-events-none"
              />
            </g>
          );
        })}

        <text x={LEFT_PADDING - 6} y={toY(maxW) + 4} fontSize={11} fill="currentColor" opacity={0.6} textAnchor="end">
          {maxW.toFixed(1)}
        </text>
        <text x={LEFT_PADDING - 6} y={toY(minW) + 4} fontSize={11} fill="currentColor" opacity={0.6} textAnchor="end">
          {minW.toFixed(1)}
        </text>

        <text x={LEFT_PADDING} y={HEIGHT - 12} fontSize={11} fill="currentColor" opacity={0.6}>
          {axisLabel(sorted[0].date)}
        </text>
        <text x={WIDTH - PADDING} y={HEIGHT - 12} fontSize={11} fill="currentColor" opacity={0.6} textAnchor="end">
          {axisLabel(sorted[sorted.length - 1].date)}
        </text>
      </svg>

      {selected && (
        <div className="mt-3 p-4 rounded-2xl border-2 border-theme-accent/20 bg-theme-accent/5">
          <div className="text-sm font-bold opacity-60 mb-2">
            {selected.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </div>
          <form action={updateWeightEntry} className="flex items-end gap-3 flex-wrap">
            <input type="hidden" name="id" value={selected.id} />
            <label className="flex flex-col text-[10px] font-bold opacity-50 uppercase tracking-wide">
              Weight (lb)
              <input
                type="number"
                step="0.1"
                name="weightLb"
                defaultValue={selected.weightLb}
                required
                className="w-24 text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1 mt-0.5"
              />
            </label>
            <SubmitButton className="px-4 py-2 rounded-full bg-theme-accent text-theme-own text-sm font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
              Save
            </SubmitButton>
          </form>
          <div className="flex items-center gap-4 mt-3">
            <form action={deleteWeightEntry}>
              <input type="hidden" name="id" value={selected.id} />
              <SubmitButton
                pendingLabel="Deleting…"
                savedLabel="Deleted"
                className="px-4 py-2 rounded-full border-2 border-red-500/40 text-red-500 text-sm font-extrabold hover:bg-red-500/10 active:scale-95 transition"
              >
                Delete entry
              </SubmitButton>
            </form>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs font-bold opacity-50 underline underline-offset-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
