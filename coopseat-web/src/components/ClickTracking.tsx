'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';
import { DOWNLOAD_URL } from '@/lib/links';

const OAUTH_PREFIX = '/api/auth/oauth/';
const FILE_PREFIX = `${DOWNLOAD_URL}/`;

/** `/download` and `/pt-BR/download`, plus the installer and portable files under either. */
function downloadTarget(
  href: string,
): { kind: 'page' } | { kind: 'file'; variant: string } | null {
  const path = href.split(/[?#]/)[0] ?? href;
  if (path === DOWNLOAD_URL || path.endsWith(DOWNLOAD_URL))
    return { kind: 'page' };
  const file = path.match(/\/download\/([^/]+)$/);
  return file?.[1] ? { kind: 'file', variant: file[1] } : null;
}

/** Delegated so server-rendered links (header, footer, provider buttons) need no client wrapper. */
export function ClickTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link =
        e.target instanceof Element
          ? e.target.closest(
              `a[href$="${DOWNLOAD_URL}"], a[href*="${FILE_PREFIX}"], a[href^="${OAUTH_PREFIX}"]`,
            )
          : null;
      if (!link) return;
      const href = link.getAttribute('href') ?? '';
      const download = downloadTarget(href);
      if (download?.kind === 'page') {
        const area = link.closest('header, footer, section');
        trackEvent({
          name: 'download_click',
          link_location: area?.id || area?.tagName.toLowerCase() || 'page',
        });
      } else if (download?.kind === 'file') {
        trackEvent({
          name: 'download_start',
          variant: download.variant,
        });
      } else if (href.startsWith(OAUTH_PREFIX)) {
        trackEvent({
          name: 'oauth_start',
          provider: href.slice(OAUTH_PREFIX.length).split('?')[0] ?? '',
          link_location: window.location.pathname,
        });
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
