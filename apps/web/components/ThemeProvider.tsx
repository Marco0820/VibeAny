"use client";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

type ThemeCtx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const Ctx = createContext<ThemeCtx | null>(null);

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default function ThemeProvider({
  children,
  defaultTheme = 'light',
  persist = true,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  persist?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && persist) {
      const stored = localStorage.getItem('theme') as Theme | null;
      if (stored) {
        return stored;
      }
    }
    return defaultTheme;
  });

  useEffect(() => {
    // Apply theme class on mount
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (persist) {
      localStorage.setItem('theme', theme);
    }
  }, [persist, theme]);

  useEffect(() => {
    if (!persist) {
      setTheme(defaultTheme);
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const stored = localStorage.getItem('theme') as Theme | null;
    if (!stored) {
      setTheme(defaultTheme);
    }
  }, [defaultTheme, persist]);

  const value = useMemo(() => ({ theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }), [theme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
