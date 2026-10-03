/** Empty disables Google Analytics and, with it, the cookie banner (no optional cookies left to consent to). */
export const GA_ID = process.env['NEXT_PUBLIC_GA_ID'] ?? '';
export const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
