import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '../app/globals.css';
import '../styles/vibeany-global.css';
import 'highlight.js/styles/github-dark.css';
import ThemeProvider from '@/components/ThemeProvider';
import GlobalSettingsProvider from '@/contexts/GlobalSettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import LandingHeaderPages from '@/components/LandingHeaderPages';

export default function VibeAnyApp({ Component, pageProps }: AppProps) {
  const isVibeAnyRoute = Boolean((pageProps as any)?.isVibeAnyRoute);

  // Remove toggling of root html class to avoid layout flashes; styles are now scoped to .vibeany-shell
  useEffect(() => {}, [isVibeAnyRoute]);

  const shellClassName = isVibeAnyRoute
    ? 'vibeany-shell min-h-screen'
    : 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-200';
  const mainClassName = isVibeAnyRoute ? '' : 'transition-colors duration-200';

  return (
    <ThemeProvider
      defaultTheme={isVibeAnyRoute ? 'dark' : 'light'}
      persist={!isVibeAnyRoute}
    >
      <AuthProvider>
        <GlobalSettingsProvider>
          <div className={shellClassName}>
            <LandingHeaderPages />
            <main className={mainClassName}>
              <Component {...pageProps} />
            </main>
          </div>
        </GlobalSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
