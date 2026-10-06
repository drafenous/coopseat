import { describe, expect, it } from 'vitest';
import {
  classifyMediaAccess,
  nativeAccessFailure,
  type MediaPrivacy,
  type SiteMediaPermission,
} from '../../packages/ui/src/lib/media-access';

const granted: SiteMediaPermission = {
  camera: 'granted',
  microphone: 'granted',
};
const allowed: MediaPrivacy = { camera: 'allow', microphone: 'allow' };
const denied: MediaPrivacy = { camera: 'deny', microphone: 'deny' };
const unknownPrivacy: MediaPrivacy = {
  camera: 'unknown',
  microphone: 'unknown',
};

describe('media access classification', () => {
  it('treats a desktop hang as an external permission prompt', () => {
    expect(
      classifyMediaAccess({
        pending: true,
        desktop: true,
        device: 'both',
        errorName: '',
        site: { camera: 'prompt', microphone: 'prompt' },
        privacy: allowed,
      }).kind,
    ).toBe('waiting-external');
  });

  it('keeps a browser hang on the site prompt', () => {
    expect(
      classifyMediaAccess({
        pending: true,
        desktop: false,
        device: 'both',
        errorName: '',
        site: { camera: 'prompt', microphone: 'granted' },
        privacy: unknownPrivacy,
      }).kind,
    ).toBe('browser-prompt');
    expect(
      classifyMediaAccess({
        pending: true,
        desktop: false,
        device: 'camera',
        errorName: '',
        site: granted,
        privacy: unknownPrivacy,
      }).kind,
    ).toBe('waiting-external');
    expect(
      classifyMediaAccess({
        pending: true,
        desktop: false,
        device: 'both',
        errorName: '',
        site: { camera: 'unknown', microphone: 'unknown' },
        privacy: unknownPrivacy,
      }).kind,
    ).toBe('waiting');
  });

  it('uses Windows consent to separate privacy blocks from external blocks', () => {
    expect(
      classifyMediaAccess({
        pending: false,
        desktop: true,
        device: 'both',
        errorName: 'NotAllowedError',
        site: granted,
        privacy: denied,
      }),
    ).toEqual({ kind: 'windows-privacy', device: 'both' });
    expect(
      classifyMediaAccess({
        pending: false,
        desktop: true,
        device: 'both',
        errorName: 'NotReadableError',
        site: granted,
        privacy: { camera: 'allow', microphone: 'deny' },
      }),
    ).toEqual({ kind: 'windows-privacy', device: 'microphone' });
    expect(
      classifyMediaAccess({
        pending: false,
        desktop: true,
        device: 'camera',
        errorName: 'NotAllowedError',
        site: granted,
        privacy: allowed,
      }).kind,
    ).toBe('external-block');
    expect(
      classifyMediaAccess({
        pending: false,
        desktop: true,
        device: 'microphone',
        errorName: 'NotReadableError',
        site: granted,
        privacy: unknownPrivacy,
      }).kind,
    ).toBe('default');
  });

  it('uses the site permission in the browser', () => {
    expect(
      classifyMediaAccess({
        pending: false,
        desktop: false,
        device: 'camera',
        errorName: 'NotAllowedError',
        site: { camera: 'denied', microphone: 'prompt' },
        privacy: unknownPrivacy,
      }).kind,
    ).toBe('browser-denied');
    expect(
      classifyMediaAccess({
        pending: false,
        desktop: false,
        device: 'both',
        errorName: 'NotReadableError',
        site: granted,
        privacy: unknownPrivacy,
      }).kind,
    ).toBe('external-block-web');
    expect(
      classifyMediaAccess({
        pending: false,
        desktop: false,
        device: 'camera',
        errorName: 'OverconstrainedError',
        site: granted,
        privacy: allowed,
      }).kind,
    ).toBe('default');
  });

  it('recognizes native device-open failures', () => {
    expect(nativeAccessFailure('Open capture device (0x80070005)')).toBe(
      'camera',
    );
    expect(
      nativeAccessFailure('Vídeo sem áudio: WASAPI activate (0x80070490)'),
    ).toBe('microphone');
    expect(
      nativeAccessFailure('Placa de captura desconectada ou não encontrada.'),
    ).toBe(null);
  });
});
