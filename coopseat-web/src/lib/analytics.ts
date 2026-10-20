/** Empty disables Google Analytics. */
export const GA_ID = process.env['NEXT_PUBLIC_GA_ID'] ?? '';
export const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

/** Empty disables Microsoft Clarity. The cookie banner shows when this or GA is set. */
export const CLARITY_ID = process.env['NEXT_PUBLIC_CLARITY_PROJECT_ID'] ?? '';
export const hasOptionalAnalytics = Boolean(GA_ID || CLARITY_ID);

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** `sign_up` and `login` follow GA4's recommended event names so they show up in the standard reports. */
export type AnalyticsEvent =
  | { name: 'download_click'; link_location: string }
  | { name: 'download_start'; variant: string }
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
