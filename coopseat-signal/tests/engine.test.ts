import { describe, expect, it } from 'vitest';
import {
  OWNER_PERMS,
  PENDING_TTL_MS,
  RECONNECT_GRACE_MS,
  type RoomTokenClaims,
} from '@coopseat/ui/party-protocol';
import { initialState, RoomEngine, type Effect } from '../src/engine';

const SID = '11111111-1111-4111-8111-111111111111';
const T0 = 1_800_000_000_000;
const cfg = {
  cap: 10,
  maxStreamers: 10,
  ownerGraceSeconds: 60,
  endsAt: T0 / 1000 + 3600,
  chat: true,
};

function claims(
  sub: string,
  extra: Partial<RoomTokenClaims> = {},
): RoomTokenClaims {
  return {
    sid: SID,
    rid: 'owner',
    sub,
    nick: sub,
    role: 'member',
    status: 'admitted',
    canStream: false,
    streamBlocked: false,
    chat: true,
    mod: null,
    cfg,
    exp: T0 / 1000 + 600,
    ...extra,
  };
}
const owner = () =>
  claims('owner', { role: 'owner', canStream: true, mod: OWNER_PERMS });
const sent = (fx: Effect[], to: string) =>
  fx
    .filter((e) => e.k === 'send' && e.to === to)
    .map((e) => (e as { msg: { t: string } }).msg);
const types = (fx: Effect[], to: string) => sent(fx, to).map((m) => m.t);
const msg = (o: unknown) => JSON.stringify(o);

function room() {
  let n = 0;
  const engine = new RoomEngine(initialState(SID), () => `id-${++n}`);
  engine.join(owner(), T0);
  return engine;
}

describe('RoomEngine', () => {
  it('welcomes members and announces them to the room and the backend', () => {
    const e = room();
    const fx = e.join(claims('ana'), T0);
    expect(types(fx, 'ana')).toContain('welcome');
    expect(types(fx, 'owner')).toContain('presence');
    expect(fx).toContainEqual({
      k: 'event',
      event: { type: 'joined', sessionId: SID, profileId: 'ana' },
    });
  });

  it('rejects tokens of another session and joins after the session ended', () => {
    const e = room();
    expect(types(e.join(claims('ana', { sid: 'other' }), T0), 'ana')).toEqual([
      'removed',
    ]);
    e.end('owner_ended', true);
    const again = e.join(claims('bia'), T0);
    expect(types(again, 'bia')).toEqual(['session_end']);
    expect(again).toContainEqual({
      k: 'event',
      event: { type: 'ended', sessionId: SID, reason: 'owner_ended' },
    });
  });

  it('enforces the participant cap, never against the owner', () => {
    const e = new RoomEngine(initialState(SID));
    const small = { ...cfg, cap: 2 };
    e.join(
      claims('owner', {
        role: 'owner',
        canStream: true,
        mod: OWNER_PERMS,
        cfg: small,
      }),
      T0,
    );
    e.join(claims('ana', { cfg: small }), T0);
    expect(sent(e.join(claims('bia', { cfg: small }), T0), 'bia')).toEqual([
      { t: 'removed', reason: 'full' },
    ]);
  });

  it('keeps pending users in the lobby: no peers, chat or signaling until approved', () => {
    const e = room();
    const fx = e.join(claims('ana', { status: 'pending' }), T0);
    const welcome = sent(fx, 'ana')[0] as unknown as {
      peers: unknown[];
      chat: unknown[];
    };
    expect(welcome.peers).toEqual([]);
    expect(welcome.chat).toEqual([]);
    expect(types(fx, 'owner')).toEqual(['pending']);
    expect(
      types(e.message('ana', msg({ t: 'chat', text: 'oi' }), T0), 'ana'),
    ).toEqual(['error']);
    const approved = e.internal({ action: 'approve', profileId: 'ana' });
    expect(types(approved, 'ana')).toEqual(['approved']);
    expect(types(approved, 'owner')).toEqual(['pending_removed']);
    const admitted = e.join(claims('ana'), T0);
    expect(types(admitted, 'owner')).toEqual(['pending_removed', 'presence']);
  });

  it('expires pending requests after two minutes', () => {
    const e = room();
    e.join(claims('ana', { status: 'pending' }), T0);
    e.message('ana', msg({ t: 'ping' }), T0 + PENDING_TTL_MS - 1000);
    e.message('owner', msg({ t: 'ping' }), T0 + PENDING_TTL_MS - 1000);
    const fx = e.alarm(T0 + PENDING_TTL_MS);
    expect(sent(fx, 'ana')).toEqual([{ t: 'removed', reason: 'denied' }]);
    expect(e.state.members['ana']).toBeUndefined();
  });

  it('lets permitted members stream without the owner, up to maxStreamers', () => {
    const e = room();
    e.join(claims('ana', { canStream: true }), T0);
    e.message('ana', msg({ t: 'stream_start' }), T0);
    expect(e.state.members['ana']!.streaming).toBe(true);
    e.message('owner', msg({ t: 'stream_start' }), T0);

    const capped = new RoomEngine(initialState(SID));
    const one = { ...cfg, maxStreamers: 1 };
    capped.join(
      claims('owner', {
        role: 'owner',
        canStream: true,
        mod: OWNER_PERMS,
        cfg: one,
      }),
      T0,
    );
    capped.join(claims('ana', { canStream: true, cfg: one }), T0);
    capped.message('owner', msg({ t: 'stream_start' }), T0);
    expect(
      sent(capped.message('ana', msg({ t: 'stream_start' }), T0), 'ana'),
    ).toEqual([{ t: 'error', code: 'stream_full' }]);
  });

  it('handles stream requests, session-only grants and moderator stream kills', () => {
    const e = room();
    e.join(
      claims('mod', {
        role: 'moderator',
        mod: { ...OWNER_PERMS, grantStream: false },
      }),
      T0,
    );
    e.join(claims('ana'), T0);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    expect(
      sent(e.message('ana', msg({ t: 'stream_start' }), T0), 'ana'),
    ).toEqual([{ t: 'error', code: 'stream_forbidden' }]);

    const req = e.message('ana', msg({ t: 'stream_request' }), T0);
    expect(types(req, 'owner')).toEqual(['stream_request']);
    expect(types(req, 'mod')).toEqual([]);
    expect(
      types(e.message('mod', msg({ t: 'stream_grant', to: 'ana' }), T0), 'mod'),
    ).toEqual(['error']);
    expect(
      types(
        e.message('owner', msg({ t: 'stream_grant', to: 'ana' }), T0),
        'ana',
      ),
    ).toContain('stream_granted');
    e.message('ana', msg({ t: 'stream_start' }), T0);
    expect(e.state.members['ana']!.streaming).toBe(true);

    const kill = e.message('mod', msg({ t: 'stream_kill', to: 'ana' }), T0);
    expect(e.state.members['ana']!.streaming).toBe(false);
    expect(e.state.members['ana']!.granted).toBe(false);
    expect(kill).toContainEqual({
      k: 'event',
      event: {
        type: 'stream_killed',
        sessionId: SID,
        profileId: 'ana',
        by: 'mod',
      },
    });
    expect(
      types(
        e.message('mod', msg({ t: 'stream_kill', to: 'owner' }), T0),
        'mod',
      ),
    ).toEqual(['error']);
  });

  it('never lets a stream-blocked user stream, even with a grant', () => {
    const e = room();
    e.join(claims('ana', { canStream: true, streamBlocked: true }), T0);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    expect(
      sent(e.message('ana', msg({ t: 'stream_start' }), T0), 'ana'),
    ).toEqual([{ t: 'error', code: 'stream_forbidden' }]);
  });

  it('relays SDP only between a streamer and its subscribers', () => {
    const e = room();
    e.join(claims('ana'), T0);
    e.join(claims('bia'), T0);
    const data = {
      pc: 'owner>ana',
      description: { type: 'offer', sdp: 'v=0' },
    };
    expect(
      types(
        e.message('ana', msg({ t: 'signal', to: 'owner', data }), T0),
        'ana',
      ),
    ).toEqual(['error']);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    expect(
      types(
        e.message(
          'ana',
          msg({ t: 'subscribe', to: 'owner', quality: 'high' }),
          T0,
        ),
        'owner',
      ),
    ).toEqual(['subscribe']);
    expect(
      types(
        e.message('owner', msg({ t: 'signal', to: 'ana', data }), T0),
        'ana',
      ),
    ).toEqual(['signal']);
    expect(
      types(e.message('bia', msg({ t: 'signal', to: 'ana', data }), T0), 'bia'),
    ).toEqual(['error']);
    expect(
      types(
        e.message('ana', msg({ t: 'unsubscribe', to: 'owner' }), T0),
        'owner',
      ),
    ).toEqual(['unsubscribe']);
    expect(
      types(
        e.message('owner', msg({ t: 'signal', to: 'ana', data }), T0),
        'owner',
      ),
    ).toEqual(['error']);
  });

  it('forwards paused subscriptions and announces stream stops through presence only', () => {
    const e = room();
    e.join(claims('ana', { canStream: true }), T0);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    e.message('ana', msg({ t: 'stream_start' }), T0);
    e.message('ana', msg({ t: 'subscribe', to: 'owner', quality: 'high' }), T0);
    e.message('owner', msg({ t: 'subscribe', to: 'ana', quality: 'high' }), T0);
    expect(
      sent(
        e.message(
          'ana',
          msg({ t: 'subscribe', to: 'owner', quality: 'paused' }),
          T0,
        ),
        'owner',
      ),
    ).toEqual([{ t: 'subscribe', from: 'ana', quality: 'paused' }]);
    expect(
      sent(
        e.message(
          'ana',
          msg({ t: 'subscribe', to: 'owner', quality: 'bogus' }),
          T0,
        ),
        'owner',
      ),
    ).toEqual([{ t: 'subscribe', from: 'ana', quality: 'low' }]);
    const stop = e.message('ana', msg({ t: 'stream_stop' }), T0);
    expect(types(stop, 'owner')).toEqual(['presence']);
    expect(e.state.subs['ana']).toBeUndefined();
    expect(e.state.subs['owner']).toEqual({ ana: 'low' });
  });

  it('resets a stream started again by a live streamer so viewers reconnect', () => {
    const e = room();
    e.join(claims('ana'), T0);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    e.message('ana', msg({ t: 'subscribe', to: 'owner', quality: 'high' }), T0);
    const fx = e.message('owner', msg({ t: 'stream_start' }), T0);
    expect(sent(fx, 'ana')).toEqual([{ t: 'stream_reset', id: 'owner' }]);
    expect(e.state.subs['owner']).toBeUndefined();
    expect(e.state.members['owner']!.streaming).toBe(true);
  });

  it('sanitizes chat, enforces 200 characters and rate limits', () => {
    const e = room();
    e.join(claims('ana'), T0);
    const ok = e.message(
      'ana',
      msg({ t: 'chat', text: '  olá\u0007   👋🏽 <b>x</b> ' }),
      T0,
    );
    expect(sent(ok, 'owner')).toEqual([
      {
        t: 'chat',
        msg: expect.objectContaining({ text: 'olá 👋🏽 <b>x</b>', nick: 'ana' }),
      },
    ]);
    expect(
      types(
        e.message('ana', msg({ t: 'chat', text: '👨‍👩‍👧'.repeat(201) }), T0),
        'ana',
      ),
    ).toEqual(['error']);
    expect(
      types(
        e.message('ana', msg({ t: 'chat', text: '👨‍👩‍👧'.repeat(200) }), T0),
        'owner',
      ),
    ).toEqual(['chat']);
    for (let i = 0; i < 3; i++)
      e.message('ana', msg({ t: 'chat', text: `m${i}` }), T0 + 10);
    expect(
      sent(e.message('ana', msg({ t: 'chat', text: 'flood' }), T0 + 20), 'ana'),
    ).toEqual([{ t: 'error', code: 'chat_rate_limited' }]);
  });

  it('blocks chat for muted users and lets moderators delete messages', () => {
    const e = room();
    e.join(claims('ana', { chat: false }), T0);
    e.join(claims('bia'), T0);
    expect(
      sent(e.message('ana', msg({ t: 'chat', text: 'oi' }), T0), 'ana'),
    ).toEqual([{ t: 'error', code: 'chat_forbidden' }]);
    e.message('bia', msg({ t: 'chat', text: 'oi' }), T0);
    const id = e.state.chat[0]!.id;
    expect(
      types(e.message('ana', msg({ t: 'chat_delete', id }), T0), 'ana'),
    ).toEqual(['error']);
    expect(
      types(e.message('owner', msg({ t: 'chat_delete', id }), T0), 'bia'),
    ).toEqual(['chat_deleted']);
  });

  it('kicks with permission and reports it; moderators cannot kick moderators', () => {
    const e = room();
    e.join(claims('m1', { role: 'moderator', mod: OWNER_PERMS }), T0);
    e.join(claims('m2', { role: 'moderator', mod: OWNER_PERMS }), T0);
    e.join(claims('ana'), T0);
    expect(
      types(e.message('m1', msg({ t: 'kick', to: 'm2' }), T0), 'm1'),
    ).toEqual(['error']);
    expect(
      types(e.message('ana', msg({ t: 'kick', to: 'm1' }), T0), 'ana'),
    ).toEqual(['error']);
    const fx = e.message('m1', msg({ t: 'kick', to: 'ana' }), T0);
    expect(sent(fx, 'ana')).toEqual([{ t: 'removed', reason: 'kick' }]);
    const eventAt = fx.findIndex(
      (effect) => effect.k === 'event' && effect.event.type === 'kicked',
    );
    const closeAt = fx.findIndex(
      (effect) => effect.k === 'close' && effect.to === 'ana',
    );
    expect(eventAt).toBeGreaterThanOrEqual(0);
    expect(closeAt).toBeGreaterThan(eventAt);
    expect(fx[eventAt]).toEqual({
      k: 'event',
      event: { type: 'kicked', sessionId: SID, profileId: 'ana', by: 'm1' },
    });
  });

  it('rejects a room token issued at or before a kick, and keeps that cutoff', () => {
    const e = room();
    const issued = Math.floor(T0 / 1000);
    e.join(claims('ana', { iat: issued }), T0);
    e.message('owner', msg({ t: 'kick', to: 'ana' }), T0);
    expect(
      sent(e.join(claims('ana', { iat: issued }), T0 + 1000), 'ana'),
    ).toEqual([{ t: 'removed', reason: 'kick' }]);
    expect(sent(e.join(claims('ana'), T0 + 1000), 'ana')).toEqual([
      { t: 'removed', reason: 'kick' },
    ]);
    expect(e.state.members['ana']).toBeUndefined();

    const again = e.join(claims('ana', { iat: issued + 1 }), T0 + 2000);
    expect(types(again, 'ana')).toContain('welcome');
    expect(e.state.removed?.['ana']).toMatchObject({
      at: issued,
      reason: 'kick',
    });
    expect(
      sent(e.join(claims('ana', { iat: issued }), T0 + 3000), 'ana'),
    ).toEqual([{ t: 'removed', reason: 'kick' }]);
  });

  it('records a ban after the member has already left', () => {
    const e = room();
    const issued = Math.floor(T0 / 1000);
    e.join(claims('ana', { iat: issued }), T0);
    e.disconnect('ana', T0);
    e.alarm(T0 + RECONNECT_GRACE_MS);
    expect(e.state.members['ana']).toBeUndefined();
    e.internal(
      { action: 'remove', profileId: 'ana', reason: 'ban' },
      T0 + RECONNECT_GRACE_MS,
    );
    expect(
      sent(
        e.join(claims('ana', { iat: issued }), T0 + RECONNECT_GRACE_MS + 1000),
        'ana',
      ),
    ).toEqual([{ t: 'removed', reason: 'ban' }]);
  });

  it('still accepts a refreshed token after the previous one expires', () => {
    const e = room();
    const issued = Math.floor(T0 / 1000) - 100;
    e.join(claims('ana', { exp: T0 / 1000, iat: issued }), T0);
    e.message('ana', msg({ t: 'ping' }), T0 + 200_000);
    expect(e.state.members['ana']).toBeUndefined();
    expect(e.state.removed?.['ana']).toBeUndefined();
    expect(
      types(e.join(claims('ana', { iat: issued }), T0 + 201_000), 'ana'),
    ).toContain('welcome');
  });

  it('accepts joins when a persisted room has no removal map', () => {
    const state = initialState(SID);
    delete state.removed;
    const e = new RoomEngine(state);
    expect(types(e.join(claims('ana'), T0), 'ana')).toContain('welcome');
  });

  it('survives short drops: reconnecting within the grace keeps live status', () => {
    const e = room();
    e.join(claims('ana', { canStream: true }), T0);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    e.message('ana', msg({ t: 'stream_start' }), T0);
    e.disconnect('ana', T0 + 1000);
    e.alarm(T0 + 1000 + RECONNECT_GRACE_MS - 1);
    expect(e.state.members['ana']!.streaming).toBe(true);
    e.join(claims('ana', { canStream: true }), T0 + 5000);
    expect(e.state.members['ana']).toMatchObject({
      connected: true,
      streaming: true,
    });
  });

  it('forgets members that do not come back and reports they left', () => {
    const e = room();
    e.join(claims('ana'), T0);
    e.disconnect('ana', T0);
    e.message('owner', msg({ t: 'ping' }), T0 + RECONNECT_GRACE_MS);
    const fx = e.alarm(T0 + RECONNECT_GRACE_MS);
    expect(types(fx, 'owner')).toContain('left');
    expect(fx).toContainEqual({
      k: 'event',
      event: { type: 'left', sessionId: SID, profileId: 'ana' },
    });
  });

  it('keeps the session when the owner leaves and someone else is still there', () => {
    const e = room();
    e.join(claims('ana'), T0);
    e.disconnect('owner', T0);
    e.message('ana', msg({ t: 'ping' }), T0 + RECONNECT_GRACE_MS);
    const fx = e.alarm(T0 + RECONNECT_GRACE_MS);
    expect(e.state.ended).toBeNull();
    expect(e.state.members['owner']).toBeUndefined();
    expect(e.state.members['ana']!.connected).toBe(true);
    expect(fx).toContainEqual({
      k: 'event',
      event: { type: 'left', sessionId: SID, profileId: 'owner' },
    });
  });

  it('ends the session once the room stays empty and drops session grants', () => {
    const e = room();
    e.join(claims('ana'), T0);
    e.message('owner', msg({ t: 'stream_grant', to: 'ana' }), T0);
    expect(e.state.members['ana']!.granted).toBe(true);
    e.message('ana', msg({ t: 'chat', text: 'oi' }), T0);
    e.disconnect('owner', T0);
    e.disconnect('ana', T0);
    expect(
      e.alarm(T0 + RECONNECT_GRACE_MS - 1).some((f) => f.k === 'event'),
    ).toBe(false);
    expect(e.state.ended).toBeNull();
    const fx = e.alarm(T0 + RECONNECT_GRACE_MS);
    expect(e.state.ended).toBe('empty');
    expect(e.state.members).toEqual({});
    expect(e.state.chat).toEqual([]);
    expect(fx).toContainEqual({
      k: 'event',
      event: { type: 'ended', sessionId: SID, reason: 'empty' },
    });
  });

  it('stopping the owner stream does not end the session, which still ends at max duration', () => {
    const e = room();
    e.join(claims('ana'), T0);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    e.message('ana', msg({ t: 'chat', text: 'oi' }), T0);
    const fx = e.message('owner', msg({ t: 'stream_stop' }), T0);
    expect(e.state.ended).toBeNull();
    expect(e.state.members['owner']!.streaming).toBe(false);
    expect(e.state.chat).toHaveLength(1);
    expect(types(fx, 'ana')).not.toContain('session_end');

    const timed = room();
    expect(timed.alarm(cfg.endsAt * 1000)).toContainEqual({
      k: 'event',
      event: { type: 'ended', sessionId: SID, reason: 'max_duration' },
    });
  });

  it('drops sockets with expired tokens and silent sockets', () => {
    const e = room();
    e.join(claims('ana', { exp: T0 / 1000 }), T0);
    expect(
      sent(e.message('ana', msg({ t: 'ping' }), T0 + 200_000), 'ana'),
    ).toEqual([{ t: 'removed', reason: 'token_expired' }]);

    const quiet = room();
    quiet.join(claims('bia'), T0);
    const fx = quiet.alarm(T0 + 45_000);
    expect(fx).toContainEqual({
      k: 'close',
      to: 'bia',
      code: 4002,
      reason: 'invalid',
    });
  });

  it('applies backend commands: ban removal, refresh and end', () => {
    const e = room();
    e.join(claims('ana'), T0);
    expect(
      types(e.internal({ action: 'refresh', profileId: 'ana' }), 'ana'),
    ).toEqual(['refresh_token']);
    expect(
      sent(
        e.internal({ action: 'remove', profileId: 'ana', reason: 'ban' }),
        'ana',
      ),
    ).toEqual([{ t: 'removed', reason: 'ban' }]);
    const end = e.internal({ action: 'end', reason: 'sanction' });
    expect(end.some((f) => f.k === 'event')).toBe(false);
    expect(e.state.ended).toBe('sanction');
  });
});
