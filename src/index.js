// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { migrateTourFlagsForExistingUsers } from './utils/authStorage';

// Tours: usuários que já usavam o app não veem o guia de novo após o bug do clear()
try {
  migrateTourFlagsForExistingUsers();
} catch {
  /* ignore */
}

// Aplica tema persistido antes do paint (evita flash).
// Padrão: sempre claro. Dark só se o usuário escolheu (pf-theme-v2).
try {
  let theme = localStorage.getItem('pf-theme-v2');
  if (theme !== 'light' && theme !== 'dark') {
    theme = 'light';
    localStorage.setItem('pf-theme-v2', 'light');
  }
  document.documentElement.setAttribute('data-theme', theme);
} catch {
  /* ignore */
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <HelmetProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </HelmetProvider>
);

// Registro do Service Worker para funcionar como PWA offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
