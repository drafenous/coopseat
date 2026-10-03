'use client';

import { useEffect } from 'react';
import { buttonClass } from '@/components/ui';
import { useT } from '@/i18n/client';

export function OpenApp({ to }: { to: string }) {
  const t = useT();
  useEffect(() => {
    window.location.href = to;
  }, [to]);
  return (
    <a href={to} className={buttonClass()}>
      {t.common.openApp}
    </a>
  );
}
