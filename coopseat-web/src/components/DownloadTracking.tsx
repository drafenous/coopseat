'use client';

import { useEffect } from 'react';
import { DOWNLOAD_URL } from '@/lib/links';

/** Events queue in the dataLayer and only reach Google once the user accepts analytics cookies. */
export function DownloadTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest(`a[href="${DOWNLOAD_URL}"]`) : null;
      if (!link) return;
      const area = link.closest('header, footer, section');
      window.gtag?.('event', 'download_click', { link_location: area?.id || area?.tagName.toLowerCase() || 'page' });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
