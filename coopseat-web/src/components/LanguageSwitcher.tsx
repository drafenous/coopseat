'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { cx, Select } from '@coopseat/ui/design';
import { setLocale } from '@/i18n/actions';
import { useLocale, useT } from '@/i18n/client';
import {
  LOCALES,
  LOCALE_NAMES,
  isLocale,
  localePath,
  splitLocalePath,
  type Locale,
} from '@/i18n/config';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const router = useRouter();
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
          const localized = splitLocalePath(pathname);
          if (localized && isLocale(next)) {
            router.replace(
              `${localePath(next, localized.path)}${window.location.search}${window.location.hash}`,
            );
          } else {
            router.refresh();
          }
        });
      }}
    />
  );
}
