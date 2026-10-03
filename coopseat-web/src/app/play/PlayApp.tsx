'use client';

import { CoopSeatPage, configurePlatform } from '@coopseat/ui';

configurePlatform({ kind: 'web', accounts: true });

export default function PlayApp() {
  return <CoopSeatPage />;
}
