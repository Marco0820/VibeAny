'use client';

import { useRouter } from 'next/navigation';
import { LandingPromptForm } from './landing-prompt-form';

const DOCS_URL = 'https://docs.vibeany.com/';

export function VibeAnyHero() {
  const router = useRouter();

  const gotoBuilder = () => {
    router.push('/vibeany');
  };

  const gotoDocs = () => {
    if (typeof window !== 'undefined') {
      window.open(DOCS_URL, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative isolate flex w-full flex-col items-center gap-8 rounded-[36px] border border-white/50 bg-white/85 px-6 py-12 text-center shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-8 h-40 w-40 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <span className="inline-flex items-center rounded-full border border-indigo-200/50 bg-indigo-50/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-600 shadow-sm dark:border-white/10 dark:bg-indigo-500/20 dark:text-indigo-100">
          VibeAny Platform
        </span>
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
          Build, Test, and Grow APP/Stores with AI — All in One App
        </h1>
        <p className="max-w-2xl text-base text-slate-600 dark:text-slate-200/80">
          Craft conversion-ready storefronts, automate merchandising, and deploy changes in minutes. Bring your team’s workflow into one AI-powered workspace.
        </p>
      </div>

      <div className="w-full">
        <LandingPromptForm />
      </div>

      <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={gotoBuilder}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
        >
          Start Building with AI
        </button>
        <button
          type="button"
          onClick={gotoDocs}
          className="inline-flex items-center justify-center rounded-full border border-slate-200/70 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 shadow-lg transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-white/20 dark:bg-white/10 dark:text-white"
        >
          Read the Docs
        </button>
      </div>
    </div>
  );
}

export default VibeAnyHero;
