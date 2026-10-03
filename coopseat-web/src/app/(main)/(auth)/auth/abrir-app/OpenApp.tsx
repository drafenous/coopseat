'use client';

import { useEffect } from 'react';

export function OpenApp({ to }: { to: string }) {
  useEffect(() => {
    window.location.href = to;
  }, [to]);
  return (
    <a
      href={to}
      className="block rounded-lg bg-accent px-4 py-2 text-center text-sm font-semibold text-white hover:brightness-110"
    >
      Abrir o app CoopSeat
    </a>
  );
}
