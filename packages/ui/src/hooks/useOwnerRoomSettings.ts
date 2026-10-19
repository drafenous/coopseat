import { useEffect, useRef, useState } from 'react';
import {
  partyApi,
  type BanEntry,
  type RoomView,
} from '../lib/party/api';
import { errorText } from '../lib/errors';

export type OwnerRoomSettings = {
  room: RoomView | null;
  bans: BanEntry[];
  loading: boolean;
  setRoom(room: RoomView | null): void;
  setBans(bans: BanEntry[]): void;
};

/**
 * Prefetches the owner's room config + bans as soon as they are identified as
 * owner, so the Sala settings tab opens without a cold fetch. Survives panel
 * collapse when kept at the page level.
 */
export function useOwnerRoomSettings(
  nickname: string | null,
  enabled: boolean,
  onError?: (message: string) => void,
): OwnerRoomSettings {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [bans, setBans] = useState<BanEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled || !nickname) {
      setRoom(null);
      setBans([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all([partyApi.room(), partyApi.bans(nickname)])
      .then(([nextRoom, nextBans]) => {
        if (cancelled) return;
        setRoom(nextRoom);
        setBans(nextBans.bans);
      })
      .catch((e) => {
        if (!cancelled) onErrorRef.current?.(errorText(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, nickname]);

  return { room, bans, loading, setRoom, setBans };
}
