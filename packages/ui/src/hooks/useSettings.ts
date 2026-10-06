import { useCallback, useEffect, useState } from 'react';
import { initialSettings } from '../lib/presets';
import type { Settings } from '../lib/settings';
import { SETTINGS_KEY } from '../lib/storage';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);
  const change = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) =>
      setSettings((x) => ({ ...x, [key]: value })),
    [],
  );
  return { settings, setSettings, change };
}
