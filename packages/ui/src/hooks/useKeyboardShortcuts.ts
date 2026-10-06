import { useEffect, useRef } from 'react';

type Handlers = { onFullscreen(): void; onExit(): void; onMute(): void };

export function useKeyboardShortcuts(handlers: Handlers) {
  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const h = latest.current;
      if (e.key === 'F11') {
        e.preventDefault();
        h.onFullscreen();
      }
      if (e.key === 'Escape') h.onExit();
      if (
        e.key.toLowerCase() === 'm' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLSelectElement)
      )
        h.onMute();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
}
