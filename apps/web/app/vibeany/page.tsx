import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const LazyVibeAnyLandingSection = dynamic(
  () => import('@/components/vibeany/vibeany-landing-section').then((mod) => mod.VibeAnyLandingSection),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black text-gray-500">
        Loading the VibeAny experience…
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: 'VibeAny Studio',
  description: 'Choose your assistant and model to generate production-ready storefronts with VibeAny.',
};

export default function VibeAnyExperiencePage() {
  return (
    <LazyVibeAnyLandingSection />
  );
}
