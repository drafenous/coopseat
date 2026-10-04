/** Empty disables Google Analytics and, with it, the cookie banner (no optional cookies left to consent to). */
export const GA_ID = process.env['NEXT_PUBLIC_GA_ID'] ?? '';
export const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** `sign_up` and `login` follow GA4's recommended event names so they show up in the standard reports. */
export type AnalyticsEvent =
  | { name: 'download_click'; link_location: string }
  | { name: 'oauth_start'; provider: string; link_location: string }
  | { name: 'sign_up'; method: 'email' }
  | { name: 'login'; method: 'email' }
  | { name: 'nickname_set' }
  | { name: 'age_verification_start' }
  | { name: 'mfa_enable' }
  | { name: 'account_delete' };

/** Events queue in the dataLayer and only reach Google once the user accepts analytics cookies. */
export function trackEvent({ name, ...params }: AnalyticsEvent) {
  window.gtag?.('event', name, params);
}
