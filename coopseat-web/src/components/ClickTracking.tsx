'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';
import { DOWNLOAD_URL } from '@/lib/links';

const OAUTH_PREFIX = '/api/auth/oauth/';

/** Delegated so server-rendered links (header, footer, provider buttons) need no client wrapper. */
export function ClickTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest(`a[href="${DOWNLOAD_URL}"], a[href^="${OAUTH_PREFIX}"]`) : null;
      if (!link) return;
      const href = link.getAttribute('href') ?? '';
      if (href === DOWNLOAD_URL) {
        const area = link.closest('header, footer, section');
        trackEvent({ name: 'download_click', link_location: area?.id || area?.tagName.toLowerCase() || 'page' });
      } else {
        trackEvent({ name: 'oauth_start', provider: href.slice(OAUTH_PREFIX.length).split('?')[0] ?? '', link_location: window.location.pathname });
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
