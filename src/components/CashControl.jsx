import { useState } from 'react';
import { fmtMoney } from '../format.js';

// Compact cash editor for the toolbar: shows the balance, click to edit.
export default function CashControl({ cash, onSet }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  function save(e) {
    e.preventDefault();
    const n = parseFloat(value);
    if (n >= 0) onSet(n);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        className="btn cash-btn"
        type="button"
        onClick={() => {
          setValue(cash > 0 ? String(cash) : '');
          setEditing(true);
        }}
        title="Edit cash balance"
      >
        <span className="cash-label">Cash</span> {fmtMoney(cash)}
      </button>
    );
  }

  return (
    <form className="cash-edit" onSubmit={save}>
      <input
        className="input input--num"
        type="number"
        min="0"
        step="any"
        placeholder="Cash amount"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Cash balance"
        autoFocus
      />
      <button className="btn btn--sm btn--primary" type="submit">
        Save
      </button>
      <button className="btn btn--sm" type="button" onClick={() => setEditing(false)}>
        Cancel
      </button>
    </form>
  );
}
