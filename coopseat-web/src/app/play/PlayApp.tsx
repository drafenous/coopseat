'use client';

import { CoopSeatPage, configurePlatform, type UiLocale } from '@coopseat/ui';
import { showPreferences } from 'vanilla-cookieconsent';
import { GA_ID } from '@/lib/analytics';

configurePlatform({ kind: 'web', accounts: true, cookiePreferences: GA_ID ? showPreferences : undefined });

export default function PlayApp({ locale }: { locale: UiLocale }) {
  return <CoopSeatPage locale={locale} />;
}
