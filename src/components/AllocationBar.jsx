import { useMemo, useState } from 'react';
import { fmtMoneyCompact, fmtPct } from '../format.js';

// Part-to-whole donut. Each symbol keeps the fixed color slot assigned when it
// was added (see usePortfolio) so slices never get repainted as positions come
// and go; slotless positions (9th+) fold into "Other" and cash renders as a
// striped slice. Hovering or focusing a slice shows its identity in the center.
//
// Geometry notes: angles are computed exactly (they always sum to a closed
// circle), slices are separated by a ~2px surface gap, and every slice gets a
// minimum visible angle so tiny holdings don't vanish — the excess is shaved
// proportionally off the larger slices.

const CX = 100;
const CY = 100;
const R_OUT = 92;
const R_IN = 60;
const R_MID = (R_OUT + R_IN) / 2;
const TAU = Math.PI * 2;
const GAP_RAD = 2 / R_MID; // ≈2px gap at mid-radius
const MIN_FRAC = 0.012; // ≈4.3° — smallest slice that still reads as a slice

function pt(r, a) {
  return `${(CX + r * Math.cos(a)).toFixed(2)},${(CY + r * Math.sin(a)).toFixed(2)}`;
}

function arcPath(a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M${pt(R_OUT, a0)}`,
    `A${R_OUT},${R_OUT} 0 ${large} 1 ${pt(R_OUT, a1)}`,
    `L${pt(R_IN, a1)}`,
    `A${R_IN},${R_IN} 0 ${large} 0 ${pt(R_IN, a0)}`,
    'Z',
  ].join(' ');
}

// Fractions of the whole → per-slice fractions with a minimum, deficit taken
// proportionally from the slices that can afford it.
function withMinimum(fracs) {
  const out = [...fracs];
  let deficit = 0;
  let surplusTotal = 0;
  for (const f of out) {
    if (f < MIN_FRAC) deficit += MIN_FRAC - f;
    else surplusTotal += f - MIN_FRAC;
  }
  if (deficit === 0 || surplusTotal <= 0) return out.map((f) => Math.max(f, MIN_FRAC));
  return out.map((f) =>
    f < MIN_FRAC ? MIN_FRAC : f - ((f - MIN_FRAC) / surplusTotal) * deficit
  );
}

export default function AllocationBar({ positions, quotes, slotOf, cash = 0 }) {
  const [hover, setHover] = useState(null); // segment index or null

  const { segments, total } = useMemo(() => {
    const valued = positions
      .map((p) => ({ ...p, value: (quotes[p.symbol]?.c ?? 0) * p.qty }))
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value);
    const total = valued.reduce((s, p) => s + p.value, 0) + cash;
    const head = valued.filter((p) => slotOf(p.symbol) !== 'other');
    const tail = valued.filter((p) => slotOf(p.symbol) === 'other');
    const segments = [
      ...head.map((p) => ({
        label: p.symbol,
        name: p.name,
        value: p.value,
        slot: slotOf(p.symbol),
      })),
      ...(tail.length > 0
        ? [{ label: 'Other', name: `${tail.length} smaller positions`, value: tail.reduce((s, p) => s + p.value, 0), slot: 'other' }]
        : []),
      ...(cash > 0 ? [{ label: 'Cash', name: 'Uninvested cash', value: cash, slot: 'cash' }] : []),
    ];
    return { segments, total };
  }, [positions, quotes, slotOf, cash]);

  if (total <= 0 || segments.length === 0) return null;

  const single = segments.length === 1;
  const fracs = withMinimum(segments.map((s) => s.value / total));
  const gap = single ? 0 : GAP_RAD;
  const usable = TAU - gap * segments.length;

  let angle = -Math.PI / 2; // start at 12 o'clock
  const slices = segments.map((seg, i) => {
    const sweep = fracs[i] * usable;
    const a0 = angle + gap / 2;
    const a1 = a0 + sweep;
    angle = a1 + gap / 2;
    return { ...seg, a0, a1, pct: (seg.value / total) * 100, i };
  });

  const active = hover != null ? slices[hover] : null;

  return (
    <div className="alloc">
      <div className="card-title">Allocation</div>
      <div className="alloc-layout">
        <svg
          className="donut"
          viewBox="0 0 200 200"
          role="img"
          aria-label={
            'Portfolio allocation: ' +
            slices.map((s) => `${s.label} ${s.pct.toFixed(1)}%`).join(', ')
          }
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <pattern id="cash-stripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <rect width="6" height="6" className="cash-pat-bg" />
              <rect width="3" height="6" className="cash-pat-fg" />
            </pattern>
          </defs>
          {single ? (
            <circle
              cx={CX}
              cy={CY}
              r={R_MID}
              fill="none"
              strokeWidth={R_OUT - R_IN}
              className={`donut-seg donut-stroke-${slices[0].slot}`}
              tabIndex={0}
              onMouseEnter={() => setHover(0)}
              onFocus={() => setHover(0)}
              onBlur={() => setHover(null)}
            />
          ) : (
            slices.map((s) => (
              <path
                key={s.label}
                d={arcPath(s.a0, s.a1)}
                className={
                  `donut-seg donut-fill-${s.slot}` +
                  (hover != null && hover !== s.i ? ' donut-seg--dim' : '') +
                  (hover === s.i ? ' donut-seg--on' : '')
                }
                tabIndex={0}
                aria-label={`${s.label}: ${s.pct.toFixed(1)}%`}
                onMouseEnter={() => setHover(s.i)}
                onFocus={() => setHover(s.i)}
                onBlur={() => setHover(null)}
              />
            ))
          )}
          {active ? (
            <>
              <text x={CX} y={CY - 14} textAnchor="middle" className="donut-sym">
                {active.label}
              </text>
              <text x={CX} y={CY + 6} textAnchor="middle" className="donut-pct">
                {fmtPct(active.pct, { signed: false })}
              </text>
              <text x={CX} y={CY + 24} textAnchor="middle" className="donut-val">
                {fmtMoneyCompact(active.value)}
              </text>
            </>
          ) : (
            <>
              <text x={CX} y={CY - 4} textAnchor="middle" className="donut-total-label">
                Total
              </text>
              <text x={CX} y={CY + 18} textAnchor="middle" className="donut-total">
                {fmtMoneyCompact(total)}
              </text>
            </>
          )}
        </svg>

        <div className="alloc-legend alloc-legend--col">
          {slices.map((s) => (
            <button
              key={s.label}
              type="button"
              className={'legend-item legend-item--btn' + (hover === s.i ? ' legend-item--on' : '')}
              onMouseEnter={() => setHover(s.i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s.i)}
              onBlur={() => setHover(null)}
            >
              <span className={`legend-swatch series-bg-${s.slot}`} />
              <span className="legend-label">{s.label}</span>
              <span className="legend-pct">{s.pct.toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
