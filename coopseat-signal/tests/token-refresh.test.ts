import { describe, expect, it } from 'vitest';
import {
  ROOM_TOKEN_REFRESH_MS,
  ROOM_TOKEN_TTL_SECONDS,
  roomTokenRefreshDelay,
} from '@coopseat/ui/party-protocol';

describe('room token refresh schedule', () => {
  it('renews two minutes before expiry, and immediately once that window has started', () => {
    const now = 1_700_000_000_000;
    const fresh = now / 1000 + ROOM_TOKEN_TTL_SECONDS;
    expect(roomTokenRefreshDelay(fresh, now)).toBe(ROOM_TOKEN_REFRESH_MS);
    expect(roomTokenRefreshDelay(now / 1000 + 30, now)).toBe(0);
  });
});
