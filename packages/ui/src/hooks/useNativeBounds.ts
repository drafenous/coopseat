import { useEffect, type RefObject } from 'react';
import { bridge } from '../platform';

type Hole = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

/** The native video is a separate OS window drawn above the page, so these are cut out of it to stay visible. */
const OVERLAYS =
  '[role="dialog"],[role="menu"],[role="listbox"],[data-overlay]';
const MAX_HOLES = 16;
/** Matches the modal backdrop's opacity. */
const BACKDROP_DIM = 0.8;

/**
 * Overlay areas over the screen, in device pixels relative to it. Their shadows are dropped meanwhile:
 * a shadow falls outside the cut-out, behind the video, and would show up chopped.
 */
function holes(r: DOMRect, k: number, shadowless: Set<HTMLElement>): Hole[] {
  const out: Hole[] = [],
    over = new Set<HTMLElement>();
  for (const el of document.querySelectorAll<HTMLElement>(OVERLAYS)) {
    if (out.length === MAX_HOLES) break;
    const o = el.getBoundingClientRect();
    if (
      o.width <= 0 ||
      o.height <= 0 ||
      o.right <= r.left ||
      o.left >= r.right ||
      o.bottom <= r.top ||
      o.top >= r.bottom
    )
      continue;
    // The whole element goes out, even past the screen edges, so its rounded corners land where they really are.
    const x = Math.floor((o.left - r.left) * k),
      y = Math.floor((o.top - r.top) * k);
    out.push({
      x,
      y,
      width: Math.ceil((o.right - r.left) * k) - x,
      height: Math.ceil((o.bottom - r.top) * k) - y,
      radius: Math.round(
        (parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0) * k,
      ),
    });
    over.add(el);
  }
  for (const el of shadowless)
    if (!over.has(el)) {
      el.style.boxShadow = '';
      shadowless.delete(el);
    }
  for (const el of over)
    if (!shadowless.has(el)) {
      el.style.boxShadow = 'none';
      shadowless.add(el);
    }
  return out;
}

const HIDDEN = { x: 0, y: 0, width: 0, height: 0, holes: [], dim: 0 };

export function useNativeBounds(
  screen: RefObject<HTMLElement | null>,
  active: boolean,
  dimmed: boolean,
) {
  useEffect(() => {
    // A zero rect hides the child window. Leaving the last rect up covers whatever replaced the preview.
    if (!active) {
      void bridge()?.bounds(HIDDEN);
      return;
    }
    let frame = 0,
      last = '',
      holesAt = 0,
      timer = 0;
    const shadowless = new Set<HTMLElement>();
    let cachedHoles: Hole[] = [];
    let pending: {
      x: number;
      y: number;
      width: number;
      height: number;
      holes: Hole[];
      dim: number;
    } | null = null;
    const flush = () => {
      timer = 0;
      const next = pending;
      pending = null;
      if (next) void bridge()?.bounds(next);
    };
    const tick = () => {
      const el = screen.current;
      if (el) {
        const r = el.getBoundingClientRect(),
          k = window.devicePixelRatio;
        const now = performance.now();
        // Reading overlay styles forces layout. Once a window resize starts, doing it
        // every frame keeps the page busy after the drag has ended.
        if (now - holesAt > 250) {
          holesAt = now;
          cachedHoles = holes(r, k, shadowless);
        }
        const rect = {
          x: Math.round(r.left * k),
          y: Math.round(r.top * k),
          width: Math.round(r.width * k),
          height: Math.round(r.height * k),
          holes: cachedHoles,
          dim: dimmed ? BACKDROP_DIM : 0,
        };
        const key = JSON.stringify(rect);
        if (key !== last) {
          last = key;
          pending = rect;
          // A drag sends a new size every frame. Applying each one resets the preview
          // surface and is what freezes the page.
          if (!timer) timer = window.setTimeout(flush, 100);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      flush();
      for (const el of shadowless) el.style.boxShadow = '';
    };
  }, [screen, active, dimmed]);
}
