'use client';

import { CoopSeatPage, configurePlatform, type UiLocale } from '@coopseat/ui';
import { showPreferences } from 'vanilla-cookieconsent';
import { hasOptionalAnalytics } from '@/lib/analytics';

configurePlatform({
  kind: 'web',
  accounts: true,
  cookiePreferences: hasOptionalAnalytics ? showPreferences : undefined,
});

export default function PartyApp({
  locale,
  nickname,
}: {
  locale: UiLocale;
  nickname: string;
}) {
  return <CoopSeatPage locale={locale} party={nickname} />;
}
