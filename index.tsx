import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const CHUNK_RELOAD_KEY = 'humanpartner:chunk-reload';

window.addEventListener('vite:preloadError', (event) => {
  const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
  if (alreadyReloaded) {
    return;
  }

  event.preventDefault();
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
});

window.setTimeout(() => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}, 10000);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
