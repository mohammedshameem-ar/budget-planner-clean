import React from 'react';
import ReactDOM from 'react-dom/client'
import App from './App.jsx';
import './index.css';

import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Register the custom service worker from /public/sw.js
// We do this manually so that it works in both dev AND production,
// bypassing the Vite PWA dev-mode stub (dev-dist/sw.js) which has no push handler.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[Main] Service worker registered successfully:', registration.scope);
      })
      .catch((err) => {
        console.error('[Main] Service worker registration failed:', err);
      });
  });
}

