import type { Metadata } from 'next';

import { MarketingLandingPage } from './_components/MarketingLandingPage';

export const metadata: Metadata = {
  title: 'VibeAny: Build, Test, and Grow APP/Stores with AI — All in One App',
  description:
    'Craft conversion-ready storefronts, automate merchandising, and deploy changes in minutes. Bring your team’s workflow into one AI-powered workspace.',
};

export default function HomePage() {
  return <MarketingLandingPage />;
}
