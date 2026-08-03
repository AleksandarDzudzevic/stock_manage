import Sparkline from './Sparkline.jsx';

// Stat tile contract: label · value · optional signed delta vs a named period ·
// optional sparkline. `deltaValue` (number) carries direction; `delta` and
// `deltaPct` are the pre-formatted strings to display.
export default function StatTile({ label, value, delta, deltaValue, deltaPct, deltaLabel, trend, hero }) {
  const dir = deltaValue == null ? null : deltaValue >= 0 ? 'up' : 'down';
  return (
    <div className={'stat-tile' + (hero ? ' stat-tile--hero' : '')}>
      <div className="stat-label">{label}</div>
      <div className={'stat-value' + (hero ? ' stat-value--hero' : '')}>{value}</div>
      {delta != null && dir != null && (
        <div className={`stat-delta stat-delta--${dir}`}>
          {dir === 'up' ? '▲' : '▼'} {delta}
          {deltaPct != null && <span className="stat-delta-pct"> ({deltaPct})</span>}
          {deltaLabel && <span className="stat-delta-period"> {deltaLabel}</span>}
        </div>
      )}
      {delta == null && deltaLabel && <div className="stat-delta-period">{deltaLabel}</div>}
      {trend && trend.length >= 2 && (
        <div className="stat-trend">
          <Sparkline points={trend} width={120} height={28} />
        </div>
      )}
    </div>
  );
}
