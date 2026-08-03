import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNewsForSymbols } from '../api/finnhub.js';

const NEWS_REFRESH_MS = 15 * 60_000; // news doesn't need the 15s quote cadence
const CACHE_KEY = 'portfolio.news.v1';
const CACHE_FRESH_MS = 10 * 60_000;

function loadCache(symbolsKey) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c && c.symbolsKey === symbolsKey && Date.now() - c.at < CACHE_FRESH_MS) return c;
  } catch {
    /* ignore */
  }
  return null;
}

// Fetches recent company news for the held symbols on load and every 15 min.
// A short-lived localStorage cache makes reopening the app instant and avoids
// re-hitting the API on every page refresh.
export function useNews(symbols, apiKey) {
  const symbolsKey = symbols.join(',');
  const [items, setItems] = useState(() => loadCache(symbolsKey)?.items ?? []);
  const [status, setStatus] = useState('idle'); // idle | loading | live | error
  const inFlight = useRef(false);

  const refresh = useCallback(
    async (force = false) => {
      if (inFlight.current || !apiKey || symbols.length === 0) return;
      if (!force && loadCache(symbolsKey)) {
        setStatus('live');
        return;
      }
      inFlight.current = true;
      setStatus((s) => (s === 'live' ? 'live' : 'loading'));
      try {
        const news = await fetchNewsForSymbols(symbols, apiKey);
        setItems(news);
        setStatus('live');
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ items: news, at: Date.now(), symbolsKey })
        );
      } catch {
        setStatus((s) => (s === 'live' ? 'live' : 'error'));
      } finally {
        inFlight.current = false;
      }
    },
    [symbolsKey, apiKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!apiKey || symbols.length === 0) return;
    refresh();
    const id = setInterval(() => refresh(true), NEWS_REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh, apiKey, symbolsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { items, status, refresh };
}
