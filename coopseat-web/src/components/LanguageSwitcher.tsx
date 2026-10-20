'use client';

import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { cx, Select } from '@coopseat/ui/design';
import { setLocale } from '@/i18n/actions';
import { useLocale, useT } from '@/i18n/client';
import {
  LOCALES,
  LOCALE_NAMES,
  localeHref,
  splitLocalePath,
  type Locale,
} from '@/i18n/config';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <Select<Locale>
      className={cx('w-auto!', className)}
      value={locale}
      disabled={pending}
      aria-label={t.common.language}
      options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
      onChange={(next) => {
        startTransition(async () => {
          await setLocale(next);
          const path = splitLocalePath(pathname)?.path ?? pathname;
          const params = new URLSearchParams(window.location.search);
          const nextPath = params.get('next');
          if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
            params.set(
              'next',
              localeHref(next, splitLocalePath(nextPath)?.path ?? nextPath),
            );
          }
          const search = params.toString();
          // A full load, so the proxy can set the locale header. A client navigation
          // reuses the unprefixed page and keeps the previous language.
          window.location.assign(
            `${localeHref(next, path)}${search ? `?${search}` : ''}${window.location.hash}`,
          );
        });
      }}
    />
  );
}
