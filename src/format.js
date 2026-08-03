const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

export function fmtMoney(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return usd.format(n);
}

export function fmtMoneyCompact(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return Math.abs(n) >= 100_000 ? usdCompact.format(n) : usd.format(n);
}

export function fmtSigned(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return (n >= 0 ? '+' : '−') + usd.format(Math.abs(n));
}

export function fmtPct(n, { signed = true } = {}) {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = signed ? (n >= 0 ? '+' : '−') : '';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

export function fmtQty(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n);
}

// Hero figure: whole dollars below $100k, compact ($1.23M) above — keeps the
// big number inside its tile at display size.
const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function fmtHero(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return Math.abs(n) >= 100_000 ? usdCompact.format(n) : usdWhole.format(n);
}

export function timeAgo(unixSeconds) {
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
