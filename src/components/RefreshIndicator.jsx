import { REFRESH_MS } from '../hooks/useQuotes.js';

// Countdown ring: an SVG circle whose stroke sweeps over the 15s window via a
// CSS animation. Keying the element on `cycle` restarts the sweep on every
// completed refresh without any JS timers.
export default function RefreshIndicator({ status, lastUpdated, cycle, onRefresh }) {
  const label =
    status === 'loading'
      ? 'Loading…'
      : status === 'refreshing'
        ? 'Updating…'
        : status === 'error'
          ? 'Retrying — showing last data'
          : status === 'live' && lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : 'Waiting for data';

  const r = 7;
  const circ = 2 * Math.PI * r;
  const spinning = status === 'loading' || status === 'refreshing';

  return (
    <button
      className={`refresh-indicator refresh-indicator--${status}`}
      onClick={onRefresh}
      title="Refresh now"
      type="button"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle className="ring-track" cx="9" cy="9" r={r} fill="none" strokeWidth="2" />
        <circle
          key={cycle}
          className={'ring-sweep' + (spinning ? ' ring-sweep--spin' : '')}
          cx="9"
          cy="9"
          r={r}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circ}
          style={{ animationDuration: `${REFRESH_MS}ms` }}
          transform="rotate(-90 9 9)"
        />
      </svg>
      <span className="refresh-label">{label}</span>
    </button>
  );
}
