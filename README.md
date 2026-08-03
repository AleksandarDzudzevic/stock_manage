# Aleksandar Portfolio

A lightweight React app for tracking a stock portfolio with live quotes.

**Quick start:** double-click **"Aleksandar Portfolio"** on the Desktop — it builds, serves on `localhost:5173`, and opens the browser (via `./launch.sh`).

- **Live data**: Finnhub free API (60 calls/min). Quotes refresh every 15 seconds in place — a countdown ring shows the cycle, prices flash green/red on ticks, and the frame never blanks during a refetch.
- **Persistence**: positions (symbol, shares, avg cost) and your API key live in `localStorage` — add them once, they're there next launch.
- **Dashboard**: portfolio value with session trend sparkline, day change, total gain vs cost, per-position P/L, allocation donut, and simple concentration/diversification insights.
- **Holdings table**: sorted largest-position-first by default, with quick presets (Winners/Losers by % and by $) and click-to-sort columns.
- **Cash**: track an uninvested cash balance — included in portfolio value, the allocation donut (striped segment), and insights.
- **AI analysis**: run the `/portfolio-analysis` skill in Claude Code (in this project) — it reads your latest exported backup, pulls live quotes, and gives expert-level portfolio and market analysis in chat. Export a fresh backup from the app first.
- **Themes**: follows system light/dark automatically.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. On first launch, paste a free API key from
[finnhub.io/register](https://finnhub.io/register).

## Notes

- Free-tier ceiling is ~15 symbols at the 15-second cadence (60 calls/min).
- Sparklines are built from the session's own 15s samples (historical candles
  aren't on Finnhub's free tier).
- `.claude/` contains project subagents (`finnhub-integration`,
  `portfolio-ui-reviewer`) and skills (`run`, `verify`,
  `portfolio-analysis`) for working on this codebase with Claude Code.
