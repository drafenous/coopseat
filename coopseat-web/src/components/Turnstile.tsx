'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from '@/i18n/client';

type TurnstileApi = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  return new Promise((resolve, reject) => {
    const script = existing ?? Object.assign(document.createElement('script'), { src: SCRIPT_SRC, async: true });
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('turnstile')));
    if (!existing) document.head.appendChild(script);
  });
}

/** Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured (local dev). */
export function Turnstile({ onToken, resetKey }: { onToken: (token: string | undefined) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const siteKey = process.env['NEXT_PUBLIC_TURNSTILE_SITE_KEY'];
  const language = useLocale() === 'pt-BR' ? 'pt-br' : 'en';

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let id: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          language,
          theme: 'dark',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(undefined),
          'error-callback': () => onToken(undefined),
        });
      })
      .catch(() => onToken(undefined));
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey, language, onToken, resetKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
