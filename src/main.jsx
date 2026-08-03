import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// The in-app AI analyst was removed (replaced by the /portfolio-analysis
// skill in Claude Code); clear its stored key and cache so the secret
// doesn't linger with no UI left to manage it.
localStorage.removeItem('portfolio.anthropicKey.v1');
localStorage.removeItem('portfolio.aiAnalysis.v1');

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
