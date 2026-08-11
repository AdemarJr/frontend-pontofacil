import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pf-theme';

function resolveTheme(stored) {
  if (stored === 'light' || stored === 'dark') return stored;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
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
  const [theme, setThemeState] = useState(() => {
    try {
      return resolveTheme(localStorage.getItem(STORAGE_KEY));
    } catch {
      return 'light';
    }
  });

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
