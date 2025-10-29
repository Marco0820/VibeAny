'use client';

import { usePathname } from 'next/navigation';
import { LandingHeaderContent } from '@/components/LandingHeaderContent';

export default function LandingHeader() {
  const pathname = usePathname() || '/';
  return <LandingHeaderContent currentPath={pathname} />;
}
