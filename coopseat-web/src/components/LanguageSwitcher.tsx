'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocale } from '@/i18n/actions';
import { useLocale, useT } from '@/i18n/client';
import { LOCALES, LOCALE_NAMES, isLocale, localePath, splitLocalePath } from '@/i18n/config';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <label className={`inline-flex items-center gap-2 text-sm text-muted ${className}`}>
      <span className="sr-only">{t.common.language}</span>
      <select
        value={locale}
        disabled={pending}
        aria-label={t.common.language}
        className="rounded-md bg-surface px-2 py-1 text-foreground ring-1 ring-white/10"
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            await setLocale(next);
            const localized = splitLocalePath(pathname);
            if (localized && isLocale(next)) {
              router.replace(`${localePath(next, localized.path)}${window.location.search}${window.location.hash}`);
            } else {
              router.refresh();
            }
          });
        }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
