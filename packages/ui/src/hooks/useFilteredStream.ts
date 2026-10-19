import { useEffect, useRef, useState } from 'react';
import type { EffectIndex, SmoothingLevel } from '../types';
import { useVideoFilters } from './useVideoFilters';

/**
 * Re-applies the compat WebGL filters (smoothing / screen effects) to a live
 * MediaStream so party outbound + self preview match the standalone CaptureViewer.
 * When filters are off or the GPU path fails, returns the input stream unchanged.
 */
export function useFilteredStream(
  input: MediaStream | null,
  smoothing: SmoothingLevel,
  effect: EffectIndex,
): MediaStream | null {
  const need = Boolean(input && (smoothing || effect));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [filtered, setFiltered] = useState<MediaStream | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('playsinline', '');
    video.style.cssText =
      'position:fixed;left:-9999px;top:0;width:4px;height:4px;opacity:0;pointer-events:none';
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;left:-9999px;top:0;width:4px;height:4px;opacity:0;pointer-events:none';
    document.body.append(video, canvas);
    videoRef.current = video;
    canvasRef.current = canvas;
    setReady(true);
    return () => {
      video.srcObject = null;
      video.remove();
      canvas.remove();
      videoRef.current = null;
      canvasRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!need || !input) {
      video.srcObject = null;
      return;
    }
    video.srcObject = input;
    void video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [input, need]);

  const active = useVideoFilters({
    videoRef,
    canvasRef,
    smoothing,
    effect,
    enabled: need && ready,
    fullRes: true,
  });

  useEffect(() => {
    if (!need || !active || !input || !canvasRef.current) {
      setFiltered(null);
      return;
    }
    const canvasStream = canvasRef.current.captureStream(60);
    const videoTrack = canvasStream.getVideoTracks()[0];
    if (videoTrack) videoTrack.contentHint = 'motion';
    const out = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...input.getAudioTracks(),
    ]);
    setFiltered(out);
    return () => {
      canvasStream.getVideoTracks().forEach((t) => t.stop());
      setFiltered(null);
    };
  }, [need, active, input]);

  if (!input) return null;
  return need && filtered ? filtered : input;
}
