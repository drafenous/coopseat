import { useCallback, useEffect, useState, type RefObject } from 'react';
import { useT } from '../i18n';

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  setError(message: string): void;
};

export function usePictureInPicture({ videoRef, enabled, setError }: Options) {
  const t = useT();
  const supported =
    typeof document !== 'undefined' &&
    Boolean(document.pictureInPictureEnabled);
  const [active, setActive] = useState(false);

  const enter = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !supported || document.pictureInPictureElement === v) return;
    try {
      await v.requestPictureInPicture();
    } catch (e) {
      setError(t.capture.pipFailed(e instanceof Error ? e.message : String(e)));
    }
  }, [videoRef, supported, setError, t]);
  const exit = useCallback(async () => {
    if (document.pictureInPictureElement)
      await document.exitPictureInPicture().catch(() => {});
  }, []);
  const toggle = useCallback(
    () => void (document.pictureInPictureElement ? exit() : enter()),
    [enter, exit],
  );

  // The PiP events bubble, so the target video can change (e.g. the party's main tile) without rebinding.
  useEffect(() => {
    const sync = () => {
      const el = document.pictureInPictureElement;
      setActive(Boolean(el) && el === videoRef.current);
    };
    document.addEventListener('enterpictureinpicture', sync);
    document.addEventListener('leavepictureinpicture', sync);
    return () => {
      document.removeEventListener('enterpictureinpicture', sync);
      document.removeEventListener('leavepictureinpicture', sync);
    };
  }, [videoRef]);

  useEffect(() => {
    if (!enabled && document.pictureInPictureElement === videoRef.current)
      void exit();
  }, [enabled, exit, videoRef]);

  return { supported, active, toggle };
}
