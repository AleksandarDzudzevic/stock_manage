import { useMemo, useState } from 'react';
import { timeAgo } from '../format.js';

const SHOW = 10;

// Recent company news for the holdings, with per-symbol filter chips.
// Headlines link out; all API strings render as text nodes only.
export default function NewsFeed({ items, status, slotOf }) {
  const [filter, setFilter] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const symbols = useMemo(() => [...new Set(items.map((n) => n.symbol))], [items]);
  const filtered = filter ? items.filter((n) => n.symbol === filter) : items;
  const shown = expanded ? filtered : filtered.slice(0, SHOW);

  if (items.length === 0 && status !== 'loading') return null;

  return (
    <section className="news-card">
      <div className="news-header">
        <div className="card-title">News on your holdings</div>
        {symbols.length > 1 && (
          <div className="news-filters" role="group" aria-label="Filter news by symbol">
            <button
              type="button"
              className={'chip' + (filter === null ? ' chip--on' : '')}
              onClick={() => setFilter(null)}
            >
              All
            </button>
            {symbols.map((s) => (
              <button
                key={s}
                type="button"
                className={'chip' + (filter === s ? ' chip--on' : '')}
                onClick={() => setFilter(filter === s ? null : s)}
              >
                <span className={`chip-dot series-bg-${slotOf(s)}`} />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {status === 'loading' && items.length === 0 ? (
        <p className="news-loading">Loading recent news…</p>
      ) : (
        <ul className="news-list">
          {shown.map((n) => (
            <li key={n.url} className="news-item">
              <span className="news-sym">
                <span className={`chip-dot series-bg-${slotOf(n.symbol)}`} />
                {n.symbol}
              </span>
              <div className="news-body">
                <a className="news-headline" href={n.url} target="_blank" rel="noreferrer">
                  {n.headline}
                </a>
                <span className="news-meta">
                  {n.source} · {timeAgo(n.datetime)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > SHOW && (
        <button className="btn btn--sm news-more" type="button" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer' : `Show all ${filtered.length}`}
        </button>
      )}
    </section>
  );
}
