type Point = { date: Date; weightLb: number };

const WIDTH = 640;
const HEIGHT = 200;
const PADDING = 24;

export default function WeightChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm opacity-60">
        Log at least two weigh-ins to see your trend.
      </div>
    );
  }

  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const weights = sorted.map((p) => p.weightLb);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const minDate = sorted[0].date.getTime();
  const maxDate = sorted[sorted.length - 1].date.getTime();
  const dateRange = maxDate - minDate || 1;

  const toX = (t: number) => PADDING + ((t - minDate) / dateRange) * (WIDTH - PADDING * 2);
  const toY = (w: number) => HEIGHT - PADDING - ((w - minW) / range) * (HEIGHT - PADDING * 2);

  const path = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.date.getTime()).toFixed(1)} ${toY(p.weightLb).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-[200px] text-theme-accent">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />
      {sorted.map((p, i) => (
        <circle key={i} cx={toX(p.date.getTime())} cy={toY(p.weightLb)} r={3} fill="currentColor" />
      ))}
      <text x={PADDING} y={14} fontSize={11} fill="currentColor" opacity={0.6}>
        {maxW.toFixed(1)}lb
      </text>
      <text x={PADDING} y={HEIGHT - 8} fontSize={11} fill="currentColor" opacity={0.6}>
        {minW.toFixed(1)}lb
      </text>
    </svg>
  );
}
