import { bridge } from '../platform';

/** How long an open may sit unanswered before we treat it as a pending prompt. */
export const MEDIA_WAIT_MS = 12_000;

export type Consent = 'allow' | 'deny' | 'unknown';
export type SitePermission = 'granted' | 'denied' | 'prompt' | 'unknown';
export type MediaKind = 'camera' | 'microphone' | 'both';
export type MediaPrivacy = { camera: Consent; microphone: Consent };
export type SiteMediaPermission = {
  camera: SitePermission;
  microphone: SitePermission;
};

export type MediaAccessHint =
  | { kind: 'waiting-external' }
  | { kind: 'waiting' }
  | { kind: 'browser-prompt' }
  | { kind: 'windows-privacy'; device: MediaKind }
  | { kind: 'external-block' }
  | { kind: 'external-block-web' }
  | { kind: 'browser-denied' }
  | { kind: 'default' };

const SITE = new Set<SitePermission>(['granted', 'denied', 'prompt']);
const CONSENT = new Set<Consent>(['allow', 'deny', 'unknown']);

const emptyPrivacy = (): MediaPrivacy => ({
  camera: 'unknown',
  microphone: 'unknown',
});

/**
 * Desktop Chromium permission is granted inside the app, so a hang is outside it
 * (usually an antivirus webcam prompt). A fast failure only counts as Windows
 * privacy when that consent is Deny, and as an external block when it is Allow.
 */
export function classifyMediaAccess(input: {
  pending: boolean;
  desktop: boolean;
  device: MediaKind;
  errorName: string;
  site: SiteMediaPermission;
  privacy: MediaPrivacy;
}): MediaAccessHint {
  const siteState = siteOf(input.device, input.site);
  if (input.pending) {
    if (!input.desktop && siteState === 'prompt')
      return { kind: 'browser-prompt' };
    if (input.desktop || siteState === 'granted')
      return { kind: 'waiting-external' };
    return { kind: 'waiting' };
  }
  if (
    input.errorName !== 'NotAllowedError' &&
    input.errorName !== 'NotReadableError'
  )
    return { kind: 'default' };
  const privacy = consentOf(input.device, input.privacy);
  if (input.desktop && privacy === 'deny')
    return {
      kind: 'windows-privacy',
      device: deniedDevice(input.device, input.privacy),
    };
  if (input.desktop && privacy === 'allow') return { kind: 'external-block' };
  if (!input.desktop && siteState === 'granted')
    return { kind: 'external-block-web' };
  if (!input.desktop && input.errorName === 'NotAllowedError')
    return { kind: 'browser-denied' };
  return { kind: 'default' };
}

function siteOf(device: MediaKind, site: SiteMediaPermission): SitePermission {
  if (device === 'camera') return site.camera;
  if (device === 'microphone') return site.microphone;
  if (site.camera === 'prompt' || site.microphone === 'prompt') return 'prompt';
  if (site.camera === 'granted' && site.microphone === 'granted')
    return 'granted';
  if (site.camera === 'denied' || site.microphone === 'denied') return 'denied';
  return 'unknown';
}

function consentOf(device: MediaKind, privacy: MediaPrivacy): Consent {
  if (device === 'camera') return privacy.camera;
  if (device === 'microphone') return privacy.microphone;
  if (privacy.camera === 'deny' || privacy.microphone === 'deny') return 'deny';
  if (privacy.camera === 'allow' && privacy.microphone === 'allow')
    return 'allow';
  return 'unknown';
}

function deniedDevice(device: MediaKind, privacy: MediaPrivacy): MediaKind {
  if (device !== 'both') return device;
  const camera = privacy.camera === 'deny';
  const microphone = privacy.microphone === 'deny';
  if (camera && !microphone) return 'camera';
  if (microphone && !camera) return 'microphone';
  return 'both';
}

/** Device-open failures from the native capture core. Other native errors stay as written. */
export function nativeAccessFailure(message: string): MediaKind | null {
  if (/Open capture device/i.test(message)) return 'camera';
  if (/WASAPI|Audio input|Start audio capture/i.test(message))
    return 'microphone';
  return null;
}

async function readSite(
  name: 'camera' | 'microphone',
): Promise<SitePermission> {
  try {
    const status = await navigator.permissions?.query?.({
      name: name as PermissionName,
    });
    if (status && SITE.has(status.state as SitePermission))
      return status.state as SitePermission;
  } catch {
    /* camera and microphone are not queryable in every browser */
  }
  return 'unknown';
}

export async function readSitePermissions(): Promise<SiteMediaPermission> {
  const [camera, microphone] = await Promise.all([
    readSite('camera'),
    readSite('microphone'),
  ]);
  return { camera, microphone };
}

export async function readDesktopPrivacy(): Promise<MediaPrivacy> {
  const read = bridge()?.mediaPrivacy;
  if (!read) return emptyPrivacy();
  try {
    const value = await read();
    return {
      camera: CONSENT.has(value?.camera) ? value.camera : 'unknown',
      microphone: CONSENT.has(value?.microphone) ? value.microphone : 'unknown',
    };
  } catch {
    return emptyPrivacy();
  }
}

export async function resolveMediaAccess(input: {
  pending: boolean;
  device: MediaKind;
  errorName?: string;
}): Promise<MediaAccessHint> {
  const [site, privacy] = await Promise.all([
    readSitePermissions(),
    readDesktopPrivacy(),
  ]);
  return classifyMediaAccess({
    pending: input.pending,
    desktop: Boolean(bridge()),
    device: input.device,
    errorName: input.errorName ?? '',
    site,
    privacy,
  });
}
