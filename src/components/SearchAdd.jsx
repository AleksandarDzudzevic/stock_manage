import { useEffect, useRef, useState } from 'react';
import { fetchQuote, searchSymbols } from '../api/finnhub.js';
import { fmtMoney, fmtPct } from '../format.js';

// Results also show a live price + day change. Quotes are fetched one at a
// time with a gap and cached for a minute, so typing around doesn't eat into
// the 60 calls/min shared with the 15s polling loop.
const QUOTE_TTL = 60_000;
const MAX_QUOTED = 6;
const quoteCache = new Map(); // symbol -> { quote, at }

// Symbol search (debounced Finnhub lookup) + a small add form for quantity and
// average cost. Names from the API are rendered as text content only.
export default function SearchAdd({ apiKey, onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [resultQuotes, setResultQuotes] = useState({});
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null); // { symbol, name }
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [costMode, setCostMode] = useState('perShare'); // 'perShare' | 'total'
  const boxRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || picked) {
      setResults([]);
      return;
    }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const res = await searchSymbols(query.trim(), apiKey);
        setResults(res.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, apiKey, picked]);

  // Fetch quotes for the visible results (cache first, gentle pacing).
  useEffect(() => {
    if (results.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const r of results.slice(0, MAX_QUOTED)) {
        const sym = r.symbol;
        const hit = quoteCache.get(sym);
        if (hit && Date.now() - hit.at < QUOTE_TTL) {
          setResultQuotes((m) => (m[sym] === hit.quote ? m : { ...m, [sym]: hit.quote }));
          continue;
        }
        try {
          const q = await fetchQuote(sym, apiKey);
          const quote = q && q.c > 0 ? q : null; // c:0 = no data, not a $0 price
          if (quote) quoteCache.set(sym, { quote, at: Date.now() });
          if (!cancelled) setResultQuotes((m) => ({ ...m, [sym]: quote }));
        } catch {
          // Leave the row without a quote; search itself still works.
        }
        if (cancelled) return;
        await new Promise((res) => setTimeout(res, 120));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [results, apiKey]);

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setResults([]);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(r) {
    setPicked({ symbol: r.symbol, name: r.description });
    setQuery(r.symbol);
    setResults([]);
  }

  function reset() {
    setPicked(null);
    setQuery('');
    setQty('');
    setCost('');
  }

  function submit(e) {
    e.preventDefault();
    const q = parseFloat(qty);
    const c = parseFloat(cost);
    if (!picked || !(q > 0) || !(c >= 0)) return;
    // Stored cost basis is always per share; a total is converted on save.
    const costBasis = costMode === 'total' ? c / q : c;
    onAdd({ symbol: picked.symbol, name: picked.name, qty: q, costBasis });
    reset();
  }

  return (
    <form className="search-add" onSubmit={submit} ref={boxRef}>
      <div className="search-box">
        <input
          type="text"
          className="input search-input"
          placeholder="Search a stock or ETF (e.g. AAPL, Vanguard)…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPicked(null);
          }}
          aria-label="Search symbols"
        />
        {searching && <span className="search-spinner" aria-hidden="true" />}
        {results.length > 0 && (
          <ul className="search-results" role="listbox">
            {results.map((r) => {
              const q = resultQuotes[r.symbol];
              return (
                <li key={r.symbol}>
                  <button type="button" className="search-result" onClick={() => pick(r)}>
                    <span className="search-symbol">{r.displaySymbol}</span>
                    <span className="search-name">{r.description}</span>
                    {q && (
                      <span className="search-quote">
                        <span className="search-price">{fmtMoney(q.c)}</span>
                        <span className={'search-chg ' + (q.d >= 0 ? 'pos-up' : 'pos-down')}>
                          {fmtPct(q.dp)}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {picked && (
        <div className="add-fields">
          <input
            type="number"
            className="input input--num"
            placeholder="Shares"
            min="0"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-label="Number of shares"
            autoFocus
          />
          <div className="seg" role="group" aria-label="How the cost is entered">
            <button
              type="button"
              className={'seg-btn' + (costMode === 'perShare' ? ' seg-btn--on' : '')}
              aria-pressed={costMode === 'perShare'}
              onClick={() => setCostMode('perShare')}
            >
              Price / share
            </button>
            <button
              type="button"
              className={'seg-btn' + (costMode === 'total' ? ' seg-btn--on' : '')}
              aria-pressed={costMode === 'total'}
              onClick={() => setCostMode('total')}
            >
              Total cost
            </button>
          </div>
          <input
            type="number"
            className="input input--num"
            placeholder={costMode === 'total' ? 'Total amount paid' : 'Avg cost / share'}
            min="0"
            step="any"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            aria-label={costMode === 'total' ? 'Total amount paid' : 'Average cost per share'}
          />
          <button type="submit" className="btn btn--primary">
            Add {picked.symbol}
          </button>
          <button type="button" className="btn" onClick={reset}>
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}
