import { memo, useEffect, useRef, useState } from 'react';
import Sparkline from './Sparkline.jsx';
import { fmtMoney, fmtPct, fmtQty, fmtSigned } from '../format.js';

// Flashes its background green/red for a beat when the price ticks. Keyed on
// the price so the animation restarts on every change.
function PriceCell({ price }) {
  const prev = useRef(price);
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (prev.current != null && price != null && price !== prev.current) {
      setFlash(price > prev.current ? 'up' : 'down');
      const id = setTimeout(() => setFlash(null), 900);
      prev.current = price;
      return () => clearTimeout(id);
    }
    prev.current = price;
  }, [price]);
  return (
    <span key={price} className={'price-cell' + (flash ? ` flash-${flash}` : '')}>
      {fmtMoney(price)}
    </span>
  );
}

const Row = memo(function Row({ pos, quote, trend, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(pos.qty));
  const [cost, setCost] = useState(String(pos.costBasis));

  const price = quote?.c ?? null;
  const value = price != null ? price * pos.qty : null;
  const dayChange = quote ? quote.d * pos.qty : null;
  const gain = price != null ? (price - pos.costBasis) * pos.qty : null;
  const gainPct = price != null && pos.costBasis > 0 ? ((price - pos.costBasis) / pos.costBasis) * 100 : null;

  function save() {
    const q = parseFloat(qty);
    const c = parseFloat(cost);
    if (q > 0 && c >= 0) onUpdate(pos.symbol, { qty: q, costBasis: c });
    setEditing(false);
  }

  return (
    <tr>
      <td>
        <div className="pos-ident">
          <span className="pos-symbol">{pos.symbol}</span>
          <span className="pos-name">{pos.name}</span>
        </div>
      </td>
      <td className="num">
        {editing ? (
          <input
            className="input input--inline"
            type="number"
            min="0"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-label={`Shares of ${pos.symbol}`}
          />
        ) : (
          fmtQty(pos.qty)
        )}
      </td>
      <td className="num">
        {editing ? (
          <input
            className="input input--inline"
            type="number"
            min="0"
            step="any"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            aria-label={`Average cost of ${pos.symbol}`}
          />
        ) : (
          fmtMoney(pos.costBasis)
        )}
      </td>
      <td className="num">
        <PriceCell price={price} />
      </td>
      <td className={'num ' + (dayChange >= 0 ? 'pos-up' : 'pos-down')}>
        {quote ? (
          <>
            {fmtSigned(dayChange)} <span className="pct">{fmtPct(quote.dp)}</span>
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="num strong">{fmtMoney(value)}</td>
      <td className={'num ' + (gain >= 0 ? 'pos-up' : 'pos-down')}>
        {gain != null ? (
          <>
            {fmtSigned(gain)} <span className="pct">{fmtPct(gainPct)}</span>
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="spark-cell">
        <Sparkline points={trend} />
      </td>
      <td className="row-actions">
        {editing ? (
          <>
            <button className="btn btn--sm btn--primary" onClick={save} type="button">
              Save
            </button>
            <button className="btn btn--sm" onClick={() => setEditing(false)} type="button">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn--sm"
              onClick={() => {
                setQty(String(pos.qty));
                setCost(String(pos.costBasis));
                setEditing(true);
              }}
              type="button"
            >
              Edit
            </button>
            <button
              className="btn btn--sm btn--danger"
              onClick={() => onRemove(pos.symbol)}
              type="button"
              aria-label={`Remove ${pos.symbol}`}
            >
              Remove
            </button>
          </>
        )}
      </td>
    </tr>
  );
});

// Sorters return null for rows without a quote; those always sink to the
// bottom regardless of direction (so "losers first" doesn't lead with blanks).
const SORTERS = {
  symbol: (p) => p.symbol,
  qty: (p) => p.qty,
  cost: (p) => p.costBasis,
  price: (p, q) => q?.c ?? null,
  day: (p, q) => (q ? q.d * p.qty : null),
  value: (p, q) => (q ? q.c * p.qty : null),
  gain: (p, q) => (q ? (q.c - p.costBasis) * p.qty : null),
  gainPct: (p, q) => (q && p.costBasis > 0 ? ((q.c - p.costBasis) / p.costBasis) * 100 : null),
};

const DEFAULT_SORT = { key: 'value', dir: 'desc' };

// Quick sort presets shown above the table.
const PRESETS = [
  { id: 'largest', label: 'Largest', sort: DEFAULT_SORT },
  { id: 'winPct', label: 'Winners %', sort: { key: 'gainPct', dir: 'desc' } },
  { id: 'losePct', label: 'Losers %', sort: { key: 'gainPct', dir: 'asc' } },
  { id: 'winUsd', label: 'Winners $', sort: { key: 'gain', dir: 'desc' } },
  { id: 'loseUsd', label: 'Losers $', sort: { key: 'gain', dir: 'asc' } },
];

function SortHeader({ label, col, sort, onSort, num }) {
  const active = sort.key === col;
  return (
    <th className={num ? 'num' : ''} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className={'th-sort' + (active ? ' th-sort--on' : '')} type="button" onClick={() => onSort(col)}>
        {label}
        <span className="th-arrow" aria-hidden="true">
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  );
}

export default function PositionsTable({ positions, quotes, history, onUpdate, onRemove }) {
  const [sort, setSort] = useState(DEFAULT_SORT);
  if (positions.length === 0) return null;

  function toggleSort(key) {
    setSort((s) => {
      if (s.key !== key) return { key, dir: 'desc' };
      if (s.dir === 'desc') return { key, dir: 'asc' };
      return DEFAULT_SORT; // third click restores the default (largest first)
    });
  }

  const get = SORTERS[sort.key];
  const rows = [...positions].sort((a, b) => {
    const av = get(a, quotes[a.symbol]);
    const bv = get(b, quotes[b.symbol]);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="table-wrap">
      <div className="table-header">
        <span className="card-title">Holdings</span>
        <div className="sort-presets" role="group" aria-label="Sort holdings">
          {PRESETS.map((p) => {
            const on = sort.key === p.sort.key && sort.dir === p.sort.dir;
            return (
              <button
                key={p.id}
                type="button"
                className={'chip' + (on ? ' chip--on' : '')}
                aria-pressed={on}
                onClick={() => setSort(p.sort)}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <span className="table-hint">{positions.length} position{positions.length === 1 ? '' : 's'}</span>
      </div>
      <table className="positions">
        <thead>
          <tr>
            <SortHeader label="Position" col="symbol" sort={sort} onSort={toggleSort} />
            <SortHeader label="Shares" col="qty" sort={sort} onSort={toggleSort} num />
            <SortHeader label="Avg cost" col="cost" sort={sort} onSort={toggleSort} num />
            <SortHeader label="Price" col="price" sort={sort} onSort={toggleSort} num />
            <SortHeader label="Day change" col="day" sort={sort} onSort={toggleSort} num />
            <SortHeader label="Value" col="value" sort={sort} onSort={toggleSort} num />
            <SortHeader label="Total gain" col="gain" sort={sort} onSort={toggleSort} num />
            <th>Session</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((pos) => (
            <Row
              key={pos.symbol}
              pos={pos}
              quote={quotes[pos.symbol]}
              trend={history[pos.symbol]}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
