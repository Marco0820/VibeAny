'use client';

import { useRouter } from 'next/router';
import { LandingHeaderContent } from '@/components/LandingHeaderContent';

export default function LandingHeaderPages() {
  const router = useRouter();
  const path = router.asPath || router.pathname || '/';
  return <LandingHeaderContent currentPath={path.split('?')[0]} />;
}
