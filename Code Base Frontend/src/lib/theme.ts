// Theme persistence + system preference resolver
// Used by: main.tsx (boot), DashboardHeader (toggle), Settings (selector)

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'appTheme';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'light';
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return theme;
}

export function applyTheme(theme: Theme): 'light' | 'dark' {
  const resolved = resolveTheme(theme);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }
  return resolved;
}

export function setTheme(theme: Theme): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, theme);
  }
  return applyTheme(theme);
}

// Boot-time call: applies the persisted (or system-default) theme to <html>
export function initTheme(): 'light' | 'dark' {
  return applyTheme(getStoredTheme());
}
