'use client';

import { CoopSeatPage, configurePlatform, type UiLocale } from '@coopseat/ui';

configurePlatform({ kind: 'web', accounts: true });

export default function PlayApp({ locale }: { locale: UiLocale }) {
  return <CoopSeatPage locale={locale} />;
}
