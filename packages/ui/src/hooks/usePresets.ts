import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { readDefaultPreset, readPresets, type Preset } from '../lib/presets';
import type { Settings } from '../lib/settings';
import { DEFAULT_PRESET_KEY, PRESETS_KEY } from '../lib/storage';
import { useT } from '../i18n';

type Options = {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  native: boolean;
  setError: (message: string) => void;
  setNotice: (message: string) => void;
};

export function usePresets({
  settings: s,
  setSettings: setS,
  native,
  setError,
  setNotice,
}: Options) {
  const t = useT();
  const [presets, setPresets] = useState<Preset[]>(readPresets),
    [defaultPreset, setDefaultPreset] = useState(readDefaultPreset),
    [selectedPreset, setSelectedPreset] = useState(defaultPreset);
  useEffect(() => {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }, [presets]);
  useEffect(() => {
    if (defaultPreset) localStorage.setItem(DEFAULT_PRESET_KEY, defaultPreset);
    else localStorage.removeItem(DEFAULT_PRESET_KEY);
  }, [defaultPreset]);

  const savePreset = (raw: string) => {
    const name = raw.trim().slice(0, 40);
    if (!name) return;
    const exists = presets.some((p) => p.name === name);
    setPresets((list) =>
      exists
        ? list.map((p) => (p.name === name ? { name, settings: s } : p))
        : [...list, { name, settings: s }].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
    );
    setSelectedPreset(name);
    setError('');
    setNotice(exists ? t.presets.updated(name) : t.presets.saved(name));
  };
  const applyPreset = (name: string) => {
    setSelectedPreset(name);
    const p = presets.find((x) => x.name === name);
    if (!p) return;
    const backend = native ? 'native' : 'compat';
    setS((current) => ({
      ...p.settings,
      backend,
      ...(p.settings.backend === backend
        ? {}
        : {
            video: current.video,
            audio: current.audio,
            output: current.output,
            mode: current.mode,
          }),
    }));
    setError('');
    setNotice(t.presets.applied(name));
  };
  const deletePreset = () => {
    if (!selectedPreset || !confirm(t.presets.confirmDelete(selectedPreset)))
      return;
    setPresets((list) => list.filter((p) => p.name !== selectedPreset));
    if (defaultPreset === selectedPreset) setDefaultPreset('');
    setNotice(t.presets.deleted(selectedPreset));
    setSelectedPreset('');
  };
  const toggleDefaultPreset = () => {
    if (!selectedPreset) return;
    const isDefault = defaultPreset === selectedPreset;
    setDefaultPreset(isDefault ? '' : selectedPreset);
    setNotice(
      isDefault
        ? t.presets.notDefault(selectedPreset)
        : t.presets.willLoad(selectedPreset),
    );
  };

  return {
    presets,
    defaultPreset,
    selectedPreset,
    savePreset,
    applyPreset,
    deletePreset,
    toggleDefaultPreset,
  };
}
