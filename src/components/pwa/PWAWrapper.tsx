'use client';

import dynamic from 'next/dynamic';

// Import PWA component with no SSR since it uses browser APIs
const PWA = dynamic(() => import('./PWA'), { ssr: false });

export default function PWAWrapper() {
  return <PWA />;
}
