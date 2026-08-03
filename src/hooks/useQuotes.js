import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchQuotes } from '../api/finnhub.js';

export const REFRESH_MS = 15_000;
const MAX_HISTORY = 60; // ~15 min of 15s samples per symbol

// Polls quotes for the given symbols every 15s. Keeps the previous quotes on
// screen while a refetch is in flight (status goes to 'refreshing', never blank),
// and accumulates each symbol's price samples for the session sparklines.
export function useQuotes(symbols, apiKey) {
  const [quotes, setQuotes] = useState({});
  const [history, setHistory] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | refreshing | live | error | bad-key
  const [lastUpdated, setLastUpdated] = useState(null);
  const [cycle, setCycle] = useState(0); // bumps on every completed refresh — drives the countdown ring
  const symbolsKey = symbols.join(',');
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current || !apiKey || symbols.length === 0) return;
    inFlight.current = true;
    setStatus((s) => (s === 'live' || s === 'refreshing' ? 'refreshing' : 'loading'));
    try {
      const data = await fetchQuotes(symbols, apiKey);
      setQuotes((prev) => {
        const next = { ...prev };
        for (const [sym, q] of Object.entries(data)) {
          // A null quote (transient fetch error) keeps the previous value.
          if (q && q.c > 0) next[sym] = q;
        }
        return next;
      });
      setHistory((prev) => {
        const next = { ...prev };
        for (const [sym, q] of Object.entries(data)) {
          if (!q || !(q.c > 0)) continue;
          const arr = next[sym] ? [...next[sym]] : [q.pc];
          arr.push(q.c);
          next[sym] = arr.slice(-MAX_HISTORY);
        }
        return next;
      });
      setLastUpdated(new Date());
      setStatus('live');
      setCycle((c) => c + 1);
    } catch (err) {
      setStatus(err.status === 401 ? 'bad-key' : 'error');
    } finally {
      inFlight.current = false;
    }
  }, [symbolsKey, apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!apiKey || symbols.length === 0) {
      setStatus('idle');
      return;
    }
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh, apiKey, symbolsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { quotes, history, status, lastUpdated, cycle, refresh };
}
