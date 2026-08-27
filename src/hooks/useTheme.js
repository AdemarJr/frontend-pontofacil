import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pf-theme-v2';

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  // Padrão do sistema: sempre claro (não segue prefers-color-scheme)
  return 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0F172A' : '#16A34A');
}

/**
 * Tema claro/escuro persistido (UI only).
 * @returns {{ theme: 'light'|'dark', toggleTheme: () => void, setTheme: (t: 'light'|'dark') => void }}
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (next === 'light' || next === 'dark') setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
