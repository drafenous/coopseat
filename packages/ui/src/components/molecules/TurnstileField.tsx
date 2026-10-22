import { useEffect, useRef } from 'react';
import { useLocale } from '../../i18n';

type TurnstileApi = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  remove(id: string): void;
};

function turnstileApi(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadScript(): Promise<void> {
  if (turnstileApi()) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${SCRIPT_SRC}"]`,
  );
  return new Promise((resolve, reject) => {
    const script =
      existing ??
      Object.assign(document.createElement('script'), {
        src: SCRIPT_SRC,
        async: true,
      });
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('turnstile')));
    if (!existing) document.head.appendChild(script);
  });
}

/** Cloudflare Turnstile. The report form mounts this once it has a site key. */
export function TurnstileField({
  siteKey,
  onToken,
  resetKey,
}: {
  siteKey: string;
  onToken: (token: string | undefined) => void;
  resetKey?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const language = useLocale() === 'pt-BR' ? 'pt-br' : 'en';

  useEffect(() => {
    if (!ref.current) return;
    let id: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        const api = turnstileApi();
        if (cancelled || !ref.current || !api) return;
        id = api.render(ref.current, {
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
      if (id) turnstileApi()?.remove(id);
    };
  }, [siteKey, language, onToken, resetKey]);

  return <div ref={ref} className="min-h-[65px]" />;
}
