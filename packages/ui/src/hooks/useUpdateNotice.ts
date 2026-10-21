import { useEffect, useState } from 'react';
import { bridge } from '../platform';

/** Version the running desktop build is behind, or null on the web and when it is current. */
export function useUpdateNotice() {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    const update = bridge()?.update;
    if (!update) return;
    let alive = true;
    void update.current().then((offer) => {
      if (alive && offer) setVersion(offer.version);
    });
    const unsubscribe = update.onAvailable((offer) => setVersion(offer.version));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  return {
    version,
    dismiss() {
      setVersion(null);
    },
    download() {
      void bridge()?.update?.openDownload();
    },
  };
}
