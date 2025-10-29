"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';

const PLACEHOLDER = 'Ask VibeAny to create a blog about...';
const DEFAULT_PROMPT = 'Create a high-converting AI storefront for electric bikes';

const formStyle: CSSProperties = {
  color: '#0f172a',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.08), transparent 55%), radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.06), transparent 50%)',
  border: '1px solid rgba(15, 23, 42, 0.05)',
  boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)',
  WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
  WebkitFontSmoothing: 'antialiased',
  fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
};

export function LandingPromptForm() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const trimmedPrompt = useMemo(() => prompt.trim(), [prompt]);

  const navigateToVibeAny = useCallback(
    (value?: string) => {
      const targetValue = (value ?? trimmedPrompt).trim();

      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          if (targetValue) {
            window.sessionStorage.setItem('vibeany:landingPrompt', targetValue);
            window.sessionStorage.setItem('vibeany:autoSubmit', 'true');
          } else {
            window.sessionStorage.removeItem('vibeany:landingPrompt');
            window.sessionStorage.removeItem('vibeany:autoSubmit');
          }
        }
      } catch (error) {
        console.warn('Failed to persist landing prompt for VibeAny navigation', error);
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/vibeany';
      }
    },
    [trimmedPrompt],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedPrompt = window.sessionStorage.getItem('vibeany:landingPrompt');
      if (storedPrompt) {
        setPrompt(storedPrompt);
      }
    } catch (error) {
      console.warn('Failed to restore pending landing prompt', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const vibeanyGlobal = (window as any).VibeAny ?? {};
    vibeanyGlobal.navigateToExperience = (value?: string) => navigateToVibeAny(value);
    (window as any).VibeAny = vibeanyGlobal;
  }, [navigateToVibeAny]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      navigateToVibeAny();
    },
    [navigateToVibeAny],
  );

  return (
    <form
      className="group relative mb-6 flex w-full max-w-4xl flex-col gap-4 overflow-visible rounded-[28px] backdrop-blur-xl p-4 text-base transition-all duration-150 ease-in-out"
      style={formStyle}
      data-vibeany-prompt-form="true"
      onSubmit={handleSubmit}
    >
      <div className="relative flex flex-1 items-center">
        <textarea
          placeholder={PLACEHOLDER}
          className="flex w-full flex-1 resize-none overflow-y-auto rounded-xl border border-slate-100/60 bg-white/70 px-3 py-3 text-[16px] leading-snug text-gray-900 placeholder:text-gray-400 shadow-inner focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-white/50 md:text-base"
          style={{ minHeight: '120px' }}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <div className="hidden items-center gap-2 md:flex">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-100/80 bg-white/90 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-white/70">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">⌘</span>
            Press ⌘/Ctrl + Enter to generate
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div
            id="comp-mcf1u9k6"
            className="comp-mcf1u9k6"
            data-semantic-classname="button"
            dir="inherit"
          >
            <button
              type="button"
              className="DPAltb style-mcf1u9kf3__root wixui-button wixui-search-button search-button"
              data-testid="buttonContent"
              aria-label="Search"
              onClick={() => navigateToVibeAny()}
            >
              <span className="wpLgnL">
                <span className="gIbEBg wixui-button__label" data-testid="stylablebutton-label">
                  Start Now
                </span>
                <span className="HvvH6i wixui-button__icon" aria-hidden="true" data-testid="stylablebutton-icon">
                  <span>
                    <svg
                      data-bbox="0.318 0.626 12.365 16.374"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 13 17"
                      height="17"
                      width="13"
                      data-type="shape"
                    >
                      <g>
                        <path d="M.318 8.622V6.36L6.501.626l6.182 5.734v2.262L7.329 3.627V17H5.672V3.627z" />
                      </g>
                    </svg>
                  </span>
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default LandingPromptForm;
