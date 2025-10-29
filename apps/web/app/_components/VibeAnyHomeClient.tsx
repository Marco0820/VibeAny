"use client";

import { BuilderComponent } from '@builder.io/react';
import type { BuilderContent } from '@builder.io/sdk';

import '@/lib/vibeany/register';
import { VibeAnyHero } from '@/components/vibeany/vibeany-hero';
type Props = {
  vibeAnyPage: BuilderContent | null;
};

type MinimalBuilderComponentProps = {
  model?: string;
  content?: BuilderContent | undefined;
};

export default function VibeAnyHomeClient({ vibeAnyPage }: Props) {
  // Builder's typings expose a class component; cast to satisfy JSX inference in TS 5.9.
  const TypedBuilderComponent = BuilderComponent as unknown as React.ComponentType<MinimalBuilderComponentProps>;

  return (
    <div className="flex w-full flex-col gap-12">
      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <VibeAnyHero />
        </div>
      </section>
      <TypedBuilderComponent model="content-page" content={vibeAnyPage ?? undefined} />
    </div>
  );
}
