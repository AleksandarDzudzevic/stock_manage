// Session sparkline: 2px line, round joins, end-dot ≥8px with a 2px surface
// ring. Colored by direction vs the first sample (baseline = prev close).
export default function Sparkline({ points, width = 96, height = 24 }) {
  if (!points || points.length < 2) return <span className="spark-empty">·</span>;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 5; // room for the 8px end-dot + its ring
  const xStep = (width - pad * 2) / (points.length - 1);
  const y = (v) => pad + (height - pad * 2) * (1 - (v - min) / span);
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * xStep).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ');
  const up = points[points.length - 1] >= points[0];
  const endX = pad + (points.length - 1) * xStep;
  const endY = y(points[points.length - 1]);
  const cls = up ? 'spark-up' : 'spark-down';

  return (
    <svg
      className={`sparkline ${cls}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <path d={d} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle className="spark-ring" cx={endX} cy={endY} r="5" />
      <circle className="spark-dot" cx={endX} cy={endY} r="4" />
    </svg>
  );
}
