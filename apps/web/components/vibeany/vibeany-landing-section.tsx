'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const HomePageClient = dynamic(() => import('@/components/HomePageClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-24">
      <span className="text-gray-500">Loading VibeAny experience…</span>
    </div>
  ),
});

export function VibeAnyLandingSection() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 lg:py-12">
      <div className="max-w-6xl mx-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24">
              <span className="text-gray-500">Loading VibeAny experience…</span>
            </div>
          }
        >
          <HomePageClient />
        </Suspense>
      </div>
    </div>
  );
}
