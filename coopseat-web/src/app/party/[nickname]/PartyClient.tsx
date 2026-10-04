'use client';

import dynamic from 'next/dynamic';

// WebRTC, media devices and localStorage only exist in the browser.
export const PartyClient = dynamic(() => import('./PartyApp'), { ssr: false });
