import Script from 'next/script';
import { GA_ID } from '@/lib/analytics';

/**
 * Queues the gtag commands with every consent type denied. gtag.js itself is only
 * loaded by <CookieConsent> once the user accepts the analytics category.
 */
export function GoogleTag() {
  if (!GA_ID) return null;
  return (
    <Script id="google-tag" strategy="beforeInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag(){dataLayer.push(arguments);};
        gtag('consent', 'default', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
          wait_for_update: 500
        });
        gtag('js', new Date());
        gtag('config', ${JSON.stringify(GA_ID)});
      `}
    </Script>
  );
}
