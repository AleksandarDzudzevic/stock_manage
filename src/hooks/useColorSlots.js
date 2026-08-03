import { useEffect, useMemo, useState } from 'react';

const KEY = 'portfolio.slotMap.v1';
const MAX_SLOTS = 8;

// Assigns the 8 categorical color slots to the top holdings by value.
// Stability rule: a symbol keeps its slot for as long as it stays in the top
// group — slots are only reassigned when a symbol enters or leaves the group
// (the departing symbol's slot is freed for the newcomer). Persisted so colors
// survive reloads. Symbols without a slot render as "Other".
export function useColorSlots(rankedSymbols) {
  const [map, setMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) ?? {};
    } catch {
      return {};
    }
  });
  const rankedKey = rankedSymbols.join(',');

  useEffect(() => {
    // No quotes yet (startup) — keep the persisted map rather than wiping it.
    if (rankedSymbols.length === 0) return;
    setMap((prev) => {
      const next = {};
      const used = new Set();
      for (const sym of rankedSymbols) {
        const slot = prev[sym];
        if (typeof slot === 'number' && slot >= 1 && slot <= MAX_SLOTS && !used.has(slot)) {
          next[sym] = slot;
          used.add(slot);
        }
      }
      for (const sym of rankedSymbols) {
        if (next[sym] != null) continue;
        for (let i = 1; i <= MAX_SLOTS; i++) {
          if (!used.has(i)) {
            next[sym] = i;
            used.add(i);
            break;
          }
        }
      }
      const same =
        Object.keys(next).length === Object.keys(prev).length &&
        Object.entries(next).every(([k, v]) => prev[k] === v);
      if (same) return prev;
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, [rankedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => (sym) => map[sym] ?? 'other', [map]);
}
