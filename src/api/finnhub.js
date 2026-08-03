const BASE = 'https://finnhub.io/api/v1';

class FinnhubError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function get(path, params, token) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('token', token);
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new FinnhubError('Invalid API key', 401);
    if (res.status === 429) throw new FinnhubError('Rate limit reached', 429);
    throw new FinnhubError(`Finnhub request failed (${res.status})`, res.status);
  }
  return res.json();
}

// { c: current, d: change, dp: percent change, h, l, o, pc: prev close, t }
export function fetchQuote(symbol, token) {
  return get('/quote', { symbol }, token);
}

export async function searchSymbols(query, token) {
  const data = await get('/search', { q: query, exchange: 'US' }, token);
  // No type whitelist: ADRs (ASML), trusts (IAU), and newer ETFs carry types
  // other than "Common Stock"/"ETP" and would vanish from results. Instead,
  // rank exact ticker matches first, then prefix matches, keeping API order
  // within each tier.
  const q = query.trim().toUpperCase();
  const score = (r) => {
    const sym = (r.displaySymbol || r.symbol || '').toUpperCase();
    if (sym === q) return 2;
    if (sym.startsWith(q)) return 1;
    return 0;
  };
  return (data.result ?? [])
    .map((r, i) => ({ r, i }))
    .sort((a, b) => score(b.r) - score(a.r) || a.i - b.i)
    .map(({ r }) => r);
}

// Company news — free tier covers US symbols. Returns recent articles:
// { datetime (unix s), headline, source, summary, url, related, id }
export function fetchCompanyNews(symbol, token, days = 7) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const d = (x) => x.toISOString().slice(0, 10);
  return get('/company-news', { symbol, from: d(from), to: d(to) }, token);
}

// News for all holdings, fetched gently (sequential with a gap), deduped by
// url and sorted newest-first. Each article is tagged with its symbol.
export async function fetchNewsForSymbols(symbols, token, { perSymbol = 4, gapMs = 150 } = {}) {
  const seen = new Set();
  const out = [];
  for (let i = 0; i < symbols.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, gapMs));
    try {
      const articles = await fetchCompanyNews(symbols[i], token);
      for (const a of (articles ?? []).slice(0, perSymbol)) {
        if (!a.url || seen.has(a.url)) continue;
        seen.add(a.url);
        out.push({
          symbol: symbols[i],
          headline: a.headline,
          source: a.source,
          summary: a.summary,
          url: a.url,
          datetime: a.datetime,
        });
      }
    } catch (err) {
      if (err.status === 401) throw err;
      // Skip this symbol on transient failures; the rest still load.
    }
  }
  return out.sort((a, b) => b.datetime - a.datetime);
}

// Quotes come back sequentially with a small gap between requests so a large
// portfolio doesn't burst-hit the 60 calls/min free-tier limit.
export async function fetchQuotes(symbols, token, gapMs = 120) {
  const out = {};
  for (let i = 0; i < symbols.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, gapMs));
    try {
      out[symbols[i]] = await fetchQuote(symbols[i], token);
    } catch (err) {
      if (err.status === 401) throw err;
      out[symbols[i]] = null;
    }
  }
  return out;
}
