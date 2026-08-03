import { fmtPct } from '../format.js';

// Lightweight portfolio insights, computed client-side. Status colors always
// ship with an icon + label — never color alone.
export default function Insights({ positions, quotes, cash = 0 }) {
  const valued = positions
    .map((p) => ({ ...p, value: (quotes[p.symbol]?.c ?? 0) * p.qty, dp: quotes[p.symbol]?.dp }))
    .filter((p) => p.value > 0);
  const total = valued.reduce((s, p) => s + p.value, 0) + cash;
  if (total <= 0 || valued.length === 0) return null;

  const items = [];

  const biggest = valued.reduce((a, b) => (a.value > b.value ? a : b));
  const share = (biggest.value / total) * 100;
  if (share > 40) {
    items.push({
      tone: 'serious',
      icon: '⚠',
      text: `${biggest.symbol} is ${share.toFixed(0)}% of your portfolio — heavy concentration in one position.`,
    });
  } else if (share > 25) {
    items.push({
      tone: 'warning',
      icon: '△',
      text: `${biggest.symbol} is ${share.toFixed(0)}% of your portfolio — keep an eye on concentration.`,
    });
  } else {
    items.push({
      tone: 'good',
      icon: '✓',
      text: `No single position exceeds 25% — allocation is reasonably balanced.`,
    });
  }

  if (valued.length < 5) {
    items.push({
      tone: 'warning',
      icon: '△',
      text: `Only ${valued.length} position${valued.length === 1 ? '' : 's'} — broader diversification usually reduces risk.`,
    });
  } else {
    items.push({
      tone: 'good',
      icon: '✓',
      text: `${valued.length} positions held — a reasonable level of diversification.`,
    });
  }

  const cashPct = (cash / total) * 100;
  if (cashPct > 25) {
    items.push({
      tone: 'warning',
      icon: '△',
      text: `Cash is ${cashPct.toFixed(0)}% of the portfolio — a large uninvested share; make sure that's intentional.`,
    });
  } else if (cash > 0) {
    items.push({
      tone: 'neutral',
      icon: '◦',
      text: `Cash buffer: ${cashPct.toFixed(1)}% of the portfolio.`,
    });
  }

  const movers = valued.filter((p) => p.dp != null);
  if (movers.length >= 2) {
    const best = movers.reduce((a, b) => (a.dp > b.dp ? a : b));
    const worst = movers.reduce((a, b) => (a.dp < b.dp ? a : b));
    if (best.symbol !== worst.symbol) {
      items.push({
        tone: 'neutral',
        icon: '↕',
        text: `Today's movers: ${best.symbol} ${fmtPct(best.dp)}, ${worst.symbol} ${fmtPct(worst.dp)}.`,
      });
    }
  }

  return (
    <div className="insights">
      <div className="card-title">Insights</div>
      <ul className="insight-list">
        {items.map((it, i) => (
          <li key={i} className={`insight insight--${it.tone}`}>
            <span className="insight-icon" aria-hidden="true">
              {it.icon}
            </span>
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
