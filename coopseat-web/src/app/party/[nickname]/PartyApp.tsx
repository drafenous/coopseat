'use client';

import { CoopSeatPage, configurePlatform, type UiLocale } from '@coopseat/ui';
import { showPreferences } from 'vanilla-cookieconsent';
import { GA_ID } from '@/lib/analytics';

configurePlatform({ kind: 'web', accounts: true, cookiePreferences: GA_ID ? showPreferences : undefined });

export default function PartyApp({ locale, nickname }: { locale: UiLocale; nickname: string }) {
  return <CoopSeatPage locale={locale} party={nickname} />;
}
