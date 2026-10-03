'use client';

import dynamic from 'next/dynamic';

// The app reads localStorage and media devices during its first render.
export const PlayClient = dynamic(() => import('./PlayApp'), { ssr: false });
