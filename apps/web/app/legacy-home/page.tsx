import type { BuilderContent } from '@builder.io/sdk';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import VibeAnyHomeClient from '../_components/VibeAnyHomeClient';
import { augmentWithVibeAny } from '@/lib/vibeany/augmentWithVibeAny';
import { getVibeAnyContent } from '@/lib/vibeany/getContentServer';

const DEFAULT_TITLE = 'VibeAny:Create an independent website in 2 minutes';
const DEFAULT_DESCRIPTION = 'Create, launch, and grow independent storefronts with VibeAny in just two minutes.';

const getHomeBuilderPage = cache(async (): Promise<BuilderContent | null> => {
  const content = (await getVibeAnyContent('/')) as BuilderContent | null;
  return augmentWithVibeAny(content);
});

function formatTitle(): string {
  return DEFAULT_TITLE;
}

function formatDescription(page: BuilderContent | null): string {
  const data = (page?.data ?? {}) as Record<string, any>;
  return data.pageDescription || data.description || DEFAULT_DESCRIPTION;
}

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const vibeAnyPage = await getHomeBuilderPage();
  const title = formatTitle();
  const description = formatDescription(vibeAnyPage);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function LegacyHomePage() {
  const vibeAnyPage = await getHomeBuilderPage();

  if (!vibeAnyPage) {
    notFound();
  }

  return (
    <div className="home-shell">
      <VibeAnyHomeClient vibeAnyPage={vibeAnyPage} />
    </div>
  );
}
