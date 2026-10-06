import { useSyncExternalStore } from 'react';
import { bridge } from '../platform';
import { api } from './api';
import type { Backend } from './settings';
import { TELEMETRY_ID_KEY, TELEMETRY_KEY } from './storage';

/** `null` means the user hasn't been asked yet. */
export type TelemetryConsent = 'granted' | 'denied' | null;
export type TelemetryEvent =
  | { event: 'app_open' }
  | { event: 'capture_start'; backend: Backend }
  | {
      event: 'rtc_connected';
      candidateType: 'host' | 'srflx' | 'prflx' | 'relay';
    };

function read(): TelemetryConsent {
  try {
    const v = localStorage.getItem(TELEMETRY_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}
let consent = read();
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const getConsent = () => consent;

export function setTelemetryConsent(value: 'granted' | 'denied') {
  try {
    localStorage.setItem(TELEMETRY_KEY, value);
    if (value === 'denied') localStorage.removeItem(TELEMETRY_ID_KEY);
  } catch {
    /* storage unavailable */
  }
  consent = value;
  listeners.forEach((fn) => fn());
}
export const useTelemetryConsent = () =>
  useSyncExternalStore(subscribe, getConsent, getConsent);

/** Random per-install id; revoking consent deletes it, so a later opt-in starts as a new user. */
function clientId() {
  let id = localStorage.getItem(TELEMETRY_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(TELEMETRY_ID_KEY, id);
  }
  return id;
}
const sessionId = Math.floor(Date.now() / 1000);
let version: Promise<string> | null = null;

/**
 * On the site, goes to the host page's gtag, which the cookie banner gates. On desktop, only after an
 * explicit opt-in. Failures are silent: telemetry must never disturb the app.
 */
export function track(e: TelemetryEvent) {
  const b = bridge();
  if (!b) {
    const { event, ...params } = e;
    (window as { gtag?: (...args: unknown[]) => void }).gtag?.('event', event, {
      ...params,
      platform: 'web',
    });
    return;
  }
  if (consent !== 'granted') return;
  version ??= b.info().then(
    (i) => i.version,
    () => '',
  );
  void version
    .then((v) =>
      api('/api/telemetry', {
        method: 'POST',
        auth: false,
        body: { ...e, clientId: clientId(), sessionId, version: v },
      }),
    )
    .catch(() => {});
}
