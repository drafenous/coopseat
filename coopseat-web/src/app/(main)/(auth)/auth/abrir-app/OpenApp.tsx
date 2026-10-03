'use client';

import { useEffect } from 'react';
import { buttonClass } from '@/components/ui';

export function OpenApp({ to }: { to: string }) {
  useEffect(() => {
    window.location.href = to;
  }, [to]);
  return (
    <a href={to} className={buttonClass()}>
      Abrir o app CoopSeat
    </a>
  );
}
