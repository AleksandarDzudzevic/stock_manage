import { useRef, useState } from 'react';

// Export the portfolio to a JSON file / restore from one. API keys are
// deliberately NOT included — a backup file in Downloads shouldn't hold
// secrets, and keys are quick to re-paste.
export default function BackupControls({ positions, cash, onRestore }) {
  const fileRef = useRef(null);
  const [note, setNote] = useState(null); // { tone: 'ok' | 'err', text }

  function exportBackup() {
    const payload = {
      app: 'aleksandar-portfolio',
      version: 1,
      exportedAt: new Date().toISOString(),
      cash,
      positions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aleksandar-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('ok', 'Backup downloaded');
  }

  function flash(tone, text) {
    setNote({ tone, text });
    setTimeout(() => setNote(null), 4000);
  }

  async function importBackup(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data?.app !== 'aleksandar-portfolio' || !Array.isArray(data.positions)) {
        flash('err', "That file doesn't look like a portfolio backup");
        return;
      }
      if (
        positions.length > 0 &&
        !window.confirm(
          `Replace your current ${positions.length} position(s) and cash with the backup from ${
            data.exportedAt ? new Date(data.exportedAt).toLocaleDateString() : 'this file'
          }?`
        )
      ) {
        return;
      }
      const count = onRestore({ positions: data.positions, cash: data.cash ?? 0 });
      flash('ok', `Restored ${count} position${count === 1 ? '' : 's'} + cash`);
    } catch {
      flash('err', "Couldn't read that file");
    }
  }

  return (
    <div className="backup">
      <button className="btn btn--sm" type="button" onClick={exportBackup} title="Download your portfolio as a JSON file">
        Export
      </button>
      <button
        className="btn btn--sm"
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Restore portfolio from a backup file"
      >
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={importBackup}
        style={{ display: 'none' }}
        aria-label="Import portfolio backup file"
      />
      {note && <span className={`backup-note backup-note--${note.tone}`}>{note.text}</span>}
    </div>
  );
}
