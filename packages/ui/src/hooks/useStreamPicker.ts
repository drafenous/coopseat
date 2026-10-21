import { useCallback, useEffect, useState } from 'react';
import type { ScreenSource } from '../types';
import { errorText } from '../lib/errors';
import { PARTY_SOURCE_KEY } from '../lib/storage';
import {
  cardSource,
  displaySource,
  type StreamSource,
  type StreamSourceKind,
} from '../lib/stream-source';
import { bridge } from '../platform';
import { useT } from '../i18n';
import type { Party } from './useParty';

const KINDS: StreamSourceKind[] = ['card', 'screen', 'window'];

function savedKind(): StreamSourceKind {
  const v = localStorage.getItem(PARTY_SOURCE_KEY) as StreamSourceKind | null;
  return v && KINDS.includes(v) ? v : 'card';
}

type Input = {
  party: Party;
  /** Whether the picker is on screen (lists screens/windows only then). */
  enabled: boolean;
  /** The capture is running, so its picture can be sent. */
  cardReady: boolean;
  /** Opens the capture device when a card stream starts before it is running. */
  ensureCard?: () => Promise<boolean>;
  cardStream(): Promise<MediaStream | null>;
  cardLabel: string;
  /** Releases a native relay when this card copy stops. Ignored by compatibility. */
  onCardStop?(): void;
  setError(message: string): void;
  /** Called whenever a source is handed to the party. */
  onUse?(): void;
};

/**
 * What a streamer sends, chosen in the side panel: the capture device, a screen or a window. Changing
 * the choice while streaming swaps the source live.
 */
export function useStreamPicker({
  party,
  enabled,
  cardReady,
  ensureCard,
  cardStream,
  cardLabel,
  onCardStop,
  setError,
  onUse,
}: Input) {
  const t = useT().party.source;
  const desktop = Boolean(bridge());
  const [kind, setKindState] = useState<StreamSourceKind>(savedKind);
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  // System audio is the screen default. A window starts with its own program instead, so the two
  // tracks are never both on (the system mix already contains that program).
  const [systemAudio, setSystemAudioState] = useState(savedKind() !== 'window');
  const [windowAudio, setWindowAudioState] = useState(savedKind() === 'window');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const b = bridge();
    if (!b) return;
    setLoading(true);
    try {
      setSources(await b.screen.sources());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [setError]);
  useEffect(() => {
    if (enabled && desktop && kind !== 'card') void refresh();
  }, [enabled, desktop, kind, refresh]);

  const live = Boolean(party.source && party.streaming);
  const visible = sources.filter((s) => s.kind === kind);

  const audioChoice = (
    k: StreamSourceKind,
    system: boolean,
    program: boolean,
  ): boolean | 'system' | 'window' =>
    !desktop
      ? true
      : system
        ? 'system'
        : k === 'window' && program
          ? 'window'
          : false;

  const use = async (
    k: StreamSourceKind,
    id: string | null,
    mode = audioChoice(k, systemAudio, windowAudio),
  ) => {
    try {
      let source: StreamSource | null = null;
      if (k === 'card') {
        if (!cardReady && (await ensureCard?.()) === false) return;
        const stream = await cardStream();
        if (stream) source = cardSource(stream, cardLabel, onCardStop);
      } else {
        const src = sources.find((s) => s.id === id);
        if (desktop && !src) return;
        source = await displaySource({
          kind: k,
          sourceId: src?.id,
          label: src?.name,
          audio: mode,
        });
      }
      if (!source) return;
      onUse?.();
      if (party.source && party.streaming) party.switchSource(source);
      else await party.startStreaming(source);
    } catch (e) {
      // Cancelling the browser's picker is not an error.
      if ((e as DOMException)?.name !== 'NotAllowedError' || desktop)
        setError(errorText(e));
    }
  };

  const setSystemAudio = (on: boolean) => {
    setSystemAudioState(on);
    const program = on ? false : windowAudio;
    if (on) setWindowAudioState(false);
    if (live && kind !== 'card')
      void use(kind, selected, audioChoice(kind, on, program));
  };
  const setWindowAudio = (on: boolean) => {
    if (systemAudio) return;
    setWindowAudioState(on);
    if (live && kind === 'window')
      void use(kind, selected, on ? 'window' : false);
  };

  const setKind = (k: StreamSourceKind) => {
    const program = k === 'screen' && systemAudio ? false : windowAudio;
    if (program !== windowAudio) setWindowAudioState(program);
    setKindState(k);
    setSelected(null);
    localStorage.setItem(PARTY_SOURCE_KEY, k);
    // Screens/windows on desktop wait for a thumbnail; the browser asks right away.
    if (live && (k === 'card' ? cardReady : !desktop))
      void use(k, null, audioChoice(k, systemAudio, program));
  };
  const select = (id: string) => {
    setSelected(id);
    if (live) void use(kind, id);
  };

  const blocked =
    kind === 'card'
      ? undefined
      : desktop && !visible.some((s) => s.id === selected)
        ? t.pickInPanel
        : undefined;

  return {
    kind,
    setKind,
    desktop,
    sources: visible,
    selected,
    select,
    systemAudio,
    setSystemAudio,
    windowAudio: systemAudio ? false : windowAudio,
    windowAudioDisabled: systemAudio,
    setWindowAudio,
    loading,
    refresh,
    live,
    /** Why streaming can't start with the current choice, if it can't. */
    blocked,
    start: () => void use(kind, selected),
  };
}

export type StreamPicker = ReturnType<typeof useStreamPicker>;
