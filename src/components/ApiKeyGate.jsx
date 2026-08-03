import { useState } from 'react';

export default function ApiKeyGate({ onSave, invalid }) {
  const [key, setKey] = useState('');
  return (
    <div className="key-gate">
      <div className="key-card">
        <h1 className="key-title">Aleksandar Portfolio</h1>
        <p className="key-sub">
          Live quotes come from Finnhub. Create a free API key at{' '}
          <a href="https://finnhub.io/register" target="_blank" rel="noreferrer">
            finnhub.io/register
          </a>{' '}
          and paste it below — it's stored only in your browser.
        </p>
        {invalid && (
          <p className="key-error">
            <span aria-hidden="true">⚠</span> That key was rejected by Finnhub. Check it and try
            again.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (key.trim()) onSave(key.trim());
          }}
        >
          <input
            className="input key-input"
            type="text"
            placeholder="Finnhub API key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            aria-label="Finnhub API key"
            autoFocus
          />
          <button className="btn btn--primary" type="submit" disabled={!key.trim()}>
            Start tracking
          </button>
        </form>
      </div>
    </div>
  );
}
