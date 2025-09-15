import React, { useEffect, useState } from 'react';
import { getInitialTheme, setTheme, Theme } from '../lib/theme';

/**
 * ThemeToggle
 * Reusable light/dark theme toggle. Persists preference and updates `data-theme` attribute.
 */
export const ThemeToggle: React.FC<{ className?: string; }> = ({ className }) => {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    // ensure attribute applied early if not already
    setTheme(initial);
  }, []);

  function handleToggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle color theme"
      className={`inline-flex items-center gap-2 rounded-md border border-border bg-secondary/60 hover:bg-secondary/80 text-sm px-3 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-1 focus:ring-offset-background ${className || ''}`}
    >
      <span className="text-lg leading-none" aria-hidden>
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
      <span className="hidden sm:inline">
        {theme === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
};

export default ThemeToggle;
