import { useCallback, useEffect, useState } from 'react';

const POSITIONS_KEY = 'portfolio.positions.v1';
const API_KEY_KEY = 'portfolio.finnhubKey.v1';
const CASH_KEY = 'portfolio.cash.v1';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Positions: [{ symbol, name, qty, costBasis }] — costBasis is avg cost per share.
// Cash is a single USD balance held alongside the positions.
export function usePortfolio() {
  const [positions, setPositions] = useState(() => load(POSITIONS_KEY, []));
  const [cash, setCashState] = useState(() => load(CASH_KEY, 0));

  useEffect(() => {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem(CASH_KEY, JSON.stringify(cash));
  }, [cash]);

  const setCash = useCallback((amount) => {
    setCashState(amount >= 0 ? amount : 0);
  }, []);

  const addPosition = useCallback((pos) => {
    setPositions((prev) => {
      const existing = prev.find((p) => p.symbol === pos.symbol);
      if (existing) {
        // Merge: combine share counts, blend avg cost.
        const totalQty = existing.qty + pos.qty;
        const blended =
          totalQty > 0
            ? (existing.qty * existing.costBasis + pos.qty * pos.costBasis) / totalQty
            : pos.costBasis;
        return prev.map((p) =>
          p.symbol === pos.symbol ? { ...p, qty: totalQty, costBasis: blended } : p
        );
      }
      return [...prev, pos];
    });
  }, []);

  const updatePosition = useCallback((symbol, patch) => {
    setPositions((prev) => prev.map((p) => (p.symbol === symbol ? { ...p, ...patch } : p)));
  }, []);

  const removePosition = useCallback((symbol) => {
    setPositions((prev) => prev.filter((p) => p.symbol !== symbol));
  }, []);

  // Wholesale restore from a backup file. Validates each entry; colors are
  // handled separately by useColorSlots, so no slot bookkeeping here.
  const restore = useCallback(({ positions: incoming, cash: incomingCash }) => {
    const clean = [];
    for (const p of Array.isArray(incoming) ? incoming : []) {
      if (typeof p?.symbol !== 'string' || !(p.qty > 0) || !(p.costBasis >= 0)) continue;
      if (clean.some((c) => c.symbol === p.symbol)) continue;
      clean.push({
        symbol: p.symbol,
        name: typeof p.name === 'string' ? p.name : p.symbol,
        qty: p.qty,
        costBasis: p.costBasis,
      });
    }
    setPositions(clean);
    setCashState(incomingCash >= 0 ? incomingCash : 0);
    return clean.length;
  }, []);

  return { positions, cash, setCash, addPosition, updatePosition, removePosition, restore };
}

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem(API_KEY_KEY) ?? '');
  const setApiKey = useCallback((key) => {
    localStorage.setItem(API_KEY_KEY, key);
    setApiKeyState(key);
  }, []);
  const clearApiKey = useCallback(() => {
    localStorage.removeItem(API_KEY_KEY);
    setApiKeyState('');
  }, []);
  return { apiKey, setApiKey, clearApiKey };
}
