import { useEffect, useMemo, useRef, useState } from 'react';
import { useApiKey, usePortfolio } from './hooks/usePortfolio.js';
import { useQuotes } from './hooks/useQuotes.js';
import ApiKeyGate from './components/ApiKeyGate.jsx';
import RefreshIndicator from './components/RefreshIndicator.jsx';
import SearchAdd from './components/SearchAdd.jsx';
import CashControl from './components/CashControl.jsx';
import BackupControls from './components/BackupControls.jsx';
import StatTile from './components/StatTile.jsx';
import PositionsTable from './components/PositionsTable.jsx';
import AllocationBar from './components/AllocationBar.jsx';
import Insights from './components/Insights.jsx';
import NewsFeed from './components/NewsFeed.jsx';
import { useNews } from './hooks/useNews.js';
import { useColorSlots } from './hooks/useColorSlots.js';
import { fmtHero, fmtMoney, fmtPct, fmtSigned } from './format.js';

export default function App() {
  const { apiKey, setApiKey, clearApiKey } = useApiKey();
  const { positions, cash, setCash, addPosition, updatePosition, removePosition, restore } =
    usePortfolio();
  const symbols = useMemo(() => positions.map((p) => p.symbol), [positions]);
  const { quotes, history, status, lastUpdated, cycle, refresh } = useQuotes(symbols, apiKey);
  const news = useNews(symbols, apiKey);

  // Session-level portfolio value trend: one sample per completed refresh.
  const [valueTrend, setValueTrend] = useState([]);
  const trendCycle = useRef(0);

  const totals = useMemo(() => {
    let value = 0;
    let cost = 0;
    let dayChange = 0;
    let quoted = 0;
    for (const p of positions) {
      const q = quotes[p.symbol];
      if (!q) continue;
      quoted++;
      value += q.c * p.qty;
      cost += p.costBasis * p.qty;
      dayChange += q.d * p.qty;
    }
    const prevValue = value - dayChange;
    return {
      value,
      dayChange,
      dayPct: prevValue > 0 ? (dayChange / prevValue) * 100 : null,
      gain: value - cost,
      gainPct: cost > 0 ? ((value - cost) / cost) * 100 : null,
      cost,
      quoted,
    };
  }, [positions, quotes]);

  const totalWithCash = totals.value + cash;
  const prevSecurities = totals.value - totals.dayChange;
  const dayPctWithCash =
    prevSecurities + cash > 0 ? (totals.dayChange / (prevSecurities + cash)) * 100 : null;

  useEffect(() => {
    if (cycle > trendCycle.current && totalWithCash > 0) {
      trendCycle.current = cycle;
      setValueTrend((prev) => [...prev, totalWithCash].slice(-60));
    }
  }, [cycle, totalWithCash]);

  // Color slots go to the top 8 holdings by value (not insertion order) —
  // otherwise a big position added late lands in gray "Other".
  const rankedSymbols = useMemo(
    () =>
      positions
        .map((p) => ({ symbol: p.symbol, value: (quotes[p.symbol]?.c ?? 0) * p.qty }))
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
        .map((p) => p.symbol),
    [positions, quotes]
  );
  const slotOf = useColorSlots(rankedSymbols);

  if (!apiKey || status === 'bad-key') {
    return (
      <ApiKeyGate
        invalid={status === 'bad-key'}
        onSave={(key) => {
          setApiKey(key);
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Aleksandar Portfolio
        </div>
        <div className="topbar-right">
          <RefreshIndicator
            status={status}
            lastUpdated={lastUpdated}
            cycle={cycle}
            onRefresh={refresh}
          />
          <button className="btn btn--sm" onClick={clearApiKey} type="button">
            API key
          </button>
        </div>
      </header>

      <main className="content">
        <div className="toolbar">
          <SearchAdd apiKey={apiKey} onAdd={addPosition} />
          <div className="toolbar-right">
            <CashControl cash={cash} onSet={setCash} />
            <BackupControls positions={positions} cash={cash} onRestore={restore} />
          </div>
        </div>

        {positions.length === 0 && cash <= 0 ? (
          <div className="empty">
            <p className="empty-title">No positions yet</p>
            <p className="empty-sub">
              Search for a stock above, enter how many shares you own and your average cost — it's
              saved in this browser, so it'll be here next time.
            </p>
          </div>
        ) : (
          <>
            <section className="kpi-row">
              <StatTile
                hero
                label="Portfolio value"
                value={fmtHero(totalWithCash)}
                delta={fmtSigned(totals.dayChange)}
                deltaValue={totals.dayChange}
                deltaPct={dayPctWithCash != null ? fmtPct(dayPctWithCash) : null}
                deltaLabel="today"
                trend={valueTrend}
              />
              <StatTile
                label="Total gain"
                value={fmtSigned(totals.gain)}
                delta={totals.gainPct != null ? fmtPct(totals.gainPct) : null}
                deltaValue={totals.gainPct}
                deltaLabel="vs cost"
              />
              <StatTile label="Invested" value={fmtMoney(totals.cost)} />
              <StatTile
                label="Cash"
                value={fmtMoney(cash)}
                deltaLabel={
                  totalWithCash > 0 ? `${((cash / totalWithCash) * 100).toFixed(1)}% of portfolio` : null
                }
              />
              <StatTile
                label="Positions"
                value={String(positions.length)}
                deltaLabel={
                  totals.quoted < positions.length
                    ? `${totals.quoted}/${positions.length} quoted`
                    : null
                }
              />
            </section>

            <PositionsTable
              positions={positions}
              quotes={quotes}
              history={history}
              onUpdate={updatePosition}
              onRemove={removePosition}
            />

            <section className="bottom-row">
              <AllocationBar positions={positions} quotes={quotes} slotOf={slotOf} cash={cash} />
              <Insights positions={positions} quotes={quotes} cash={cash} />
            </section>

            <NewsFeed items={news.items} status={news.status} slotOf={slotOf} />
          </>
        )}
      </main>
    </div>
  );
}
