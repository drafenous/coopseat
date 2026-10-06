import React from 'react';
import { createRoot } from 'react-dom/client';
import { configurePlatform } from '@coopseat/ui';
import './index.css';
import App from './App';
configurePlatform(
  window.input
    ? { kind: 'desktop', bridge: window.input }
    : { kind: 'web', accounts: false },
);
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
