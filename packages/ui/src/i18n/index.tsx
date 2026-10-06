import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { LOCALE_KEY } from '../lib/storage';
import { platform } from '../platform';
import { en, type UiDictionary } from './en';
import { ptBR } from './pt-BR';

export type { UiDictionary } from './en';
export const UI_LOCALES = ['en', 'pt-BR'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];
export const LOCALE_NAMES: Record<UiLocale, string> = {
  en: 'English',
  'pt-BR': 'Português',
};
export const dictionaries: Record<UiLocale, UiDictionary> = {
  en,
  'pt-BR': ptBR,
};

export const isUiLocale = (x: unknown): x is UiLocale =>
  typeof x === 'string' && (UI_LOCALES as readonly string[]).includes(x);
export const matchUiLocale = (tag: string | undefined | null): UiLocale =>
  /^pt\b/i.test(tag ?? '') ? 'pt-BR' : 'en';

function detect(): UiLocale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (isUiLocale(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return typeof navigator === 'undefined'
    ? 'en'
    : matchUiLocale(navigator.language);
}

let current: UiLocale = detect();
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const getLocale = () => current;
/** Dictionary for code outside React (API client, error helpers). */
export const getT = () => dictionaries[current];

/** The site reads the `locale` cookie, so on the web the choice also follows the user to its pages. */
export function setLocale(
  locale: UiLocale,
  { persist = true }: { persist?: boolean } = {},
) {
  if (persist) {
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      /* storage unavailable */
    }
    if (platform().kind === 'web')
      document.cookie = `locale=${locale};path=/;max-age=31536000;samesite=lax`;
  }
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
  if (locale === current) return;
  current = locale;
  listeners.forEach((fn) => fn());
}

export const useLocale = () =>
  useSyncExternalStore(subscribe, getLocale, getLocale);
export const useT = () => dictionaries[useLocale()];

/** `locale` comes from the host (e.g. the site's cookie) and wins over the saved choice. */
export function I18nProvider({
  locale,
  children,
}: {
  locale?: UiLocale;
  children: ReactNode;
}) {
  useState(() => {
    if (locale) setLocale(locale, { persist: false });
  });
  return <>{children}</>;
}
