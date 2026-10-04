import { describe, expect, it } from 'vitest';
import { OWNER_PERMS, PENDING_TTL_MS, RECONNECT_GRACE_MS, type RoomTokenClaims } from '@coopseat/ui/party-protocol';
import { initialState, RoomEngine, type Effect } from '../src/engine';

const SID = '11111111-1111-4111-8111-111111111111';
const T0 = 1_800_000_000_000;
const cfg = { cap: 10, maxStreamers: 10, ownerGraceSeconds: 60, endsAt: T0 / 1000 + 3600, chat: true };

function claims(sub: string, extra: Partial<RoomTokenClaims> = {}): RoomTokenClaims {
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
const owner = () => claims('owner', { role: 'owner', canStream: true, mod: OWNER_PERMS });
const sent = (fx: Effect[], to: string) => fx.filter((e) => e.k === 'send' && e.to === to).map((e) => (e as { msg: { t: string } }).msg);
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
    expect(fx).toContainEqual({ k: 'event', event: { type: 'joined', sessionId: SID, profileId: 'ana' } });
  });

  it('rejects tokens of another session and joins after the session ended', () => {
    const e = room();
    expect(types(e.join(claims('ana', { sid: 'other' }), T0), 'ana')).toEqual(['removed']);
    e.end('owner_ended', true);
    expect(types(e.join(claims('bia'), T0), 'bia')).toEqual(['session_end']);
  });

  it('enforces the participant cap, never against the owner', () => {
    const e = new RoomEngine(initialState(SID));
    const small = { ...cfg, cap: 2 };
    e.join(claims('owner', { role: 'owner', canStream: true, mod: OWNER_PERMS, cfg: small }), T0);
    e.join(claims('ana', { cfg: small }), T0);
    expect(sent(e.join(claims('bia', { cfg: small }), T0), 'bia')).toEqual([{ t: 'removed', reason: 'full' }]);
  });

  it('keeps pending users in the lobby: no peers, chat or signaling until approved', () => {
    const e = room();
    const fx = e.join(claims('ana', { status: 'pending' }), T0);
    const welcome = sent(fx, 'ana')[0] as unknown as { peers: unknown[]; chat: unknown[] };
    expect(welcome.peers).toEqual([]);
    expect(welcome.chat).toEqual([]);
    expect(types(fx, 'owner')).toEqual(['pending']);
    expect(types(e.message('ana', msg({ t: 'chat', text: 'oi' }), T0), 'ana')).toEqual(['error']);
    expect(types(e.internal({ action: 'approve', profileId: 'ana' }), 'ana')).toEqual(['approved']);
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

  it('only lets others stream while the owner is live, up to maxStreamers', () => {
    const e = room();
    e.join(claims('ana', { canStream: true }), T0);
    expect(sent(e.message('ana', msg({ t: 'stream_start' }), T0), 'ana')).toEqual([{ t: 'error', code: 'owner_not_live' }]);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    e.message('ana', msg({ t: 'stream_start' }), T0);
    expect(e.state.members['ana']!.streaming).toBe(true);

    const capped = new RoomEngine(initialState(SID));
    const one = { ...cfg, maxStreamers: 1 };
    capped.join(claims('owner', { role: 'owner', canStream: true, mod: OWNER_PERMS, cfg: one }), T0);
    capped.join(claims('ana', { canStream: true, cfg: one }), T0);
    capped.message('owner', msg({ t: 'stream_start' }), T0);
    expect(sent(capped.message('ana', msg({ t: 'stream_start' }), T0), 'ana')).toEqual([{ t: 'error', code: 'stream_full' }]);
  });

  it('handles stream requests, session-only grants and moderator stream kills', () => {
    const e = room();
    e.join(claims('mod', { role: 'moderator', mod: { ...OWNER_PERMS, grantStream: false } }), T0);
    e.join(claims('ana'), T0);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    expect(sent(e.message('ana', msg({ t: 'stream_start' }), T0), 'ana')).toEqual([{ t: 'error', code: 'stream_forbidden' }]);

    const req = e.message('ana', msg({ t: 'stream_request' }), T0);
    expect(types(req, 'owner')).toEqual(['stream_request']);
    expect(types(req, 'mod')).toEqual([]);
    expect(types(e.message('mod', msg({ t: 'stream_grant', to: 'ana' }), T0), 'mod')).toEqual(['error']);
    expect(types(e.message('owner', msg({ t: 'stream_grant', to: 'ana' }), T0), 'ana')).toContain('stream_granted');
    e.message('ana', msg({ t: 'stream_start' }), T0);
    expect(e.state.members['ana']!.streaming).toBe(true);

    const kill = e.message('mod', msg({ t: 'stream_kill', to: 'ana' }), T0);
    expect(e.state.members['ana']!.streaming).toBe(false);
    expect(e.state.members['ana']!.granted).toBe(false);
    expect(kill).toContainEqual({ k: 'event', event: { type: 'stream_killed', sessionId: SID, profileId: 'ana', by: 'mod' } });
    expect(types(e.message('mod', msg({ t: 'stream_kill', to: 'owner' }), T0), 'mod')).toEqual(['error']);
  });

  it('never lets a stream-blocked user stream, even with a grant', () => {
    const e = room();
    e.join(claims('ana', { canStream: true, streamBlocked: true }), T0);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    expect(sent(e.message('ana', msg({ t: 'stream_start' }), T0), 'ana')).toEqual([{ t: 'error', code: 'stream_forbidden' }]);
  });

  it('relays SDP only between a streamer and its subscribers', () => {
    const e = room();
    e.join(claims('ana'), T0);
    e.join(claims('bia'), T0);
    const data = { pc: 'owner>ana', description: { type: 'offer', sdp: 'v=0' } };
    expect(types(e.message('ana', msg({ t: 'signal', to: 'owner', data }), T0), 'ana')).toEqual(['error']);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    expect(types(e.message('ana', msg({ t: 'subscribe', to: 'owner', quality: 'high' }), T0), 'owner')).toEqual(['subscribe']);
    expect(types(e.message('owner', msg({ t: 'signal', to: 'ana', data }), T0), 'ana')).toEqual(['signal']);
    expect(types(e.message('bia', msg({ t: 'signal', to: 'ana', data }), T0), 'bia')).toEqual(['error']);
    expect(types(e.message('ana', msg({ t: 'unsubscribe', to: 'owner' }), T0), 'owner')).toEqual(['unsubscribe']);
    expect(types(e.message('owner', msg({ t: 'signal', to: 'ana', data }), T0), 'owner')).toEqual(['error']);
  });

  it('forwards paused subscriptions and announces stream stops through presence only', () => {
    const e = room();
    e.join(claims('ana', { canStream: true }), T0);
    e.message('owner', msg({ t: 'stream_start' }), T0);
    e.message('ana', msg({ t: 'stream_start' }), T0);
    e.message('ana', msg({ t: 'subscribe', to: 'owner', quality: 'high' }), T0);
    e.message('owner', msg({ t: 'subscribe', to: 'ana', quality: 'high' }), T0);
    expect(sent(e.message('ana', msg({ t: 'subscribe', to: 'owner', quality: 'paused' }), T0), 'owner')).toEqual([
      { t: 'subscribe', from: 'ana', quality: 'paused' },
    ]);
    expect(sent(e.message('ana', msg({ t: 'subscribe', to: 'owner', quality: 'bogus' }), T0), 'owner')).toEqual([
      { t: 'subscribe', from: 'ana', quality: 'low' },
    ]);
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
    const ok = e.message('ana', msg({ t: 'chat', text: '  olá\u0007   👋🏽 <b>x</b> ' }), T0);
    expect(sent(ok, 'owner')).toEqual([{ t: 'chat', msg: expect.objectContaining({ text: 'olá 👋🏽 <b>x</b>', nick: 'ana' }) }]);
    expect(types(e.message('ana', msg({ t: 'chat', text: '👨‍👩‍👧'.repeat(201) }), T0), 'ana')).toEqual(['error']);
    expect(types(e.message('ana', msg({ t: 'chat', text: '👨‍👩‍👧'.repeat(200) }), T0), 'owner')).toEqual(['chat']);
    for (let i = 0; i < 3; i++) e.message('ana', msg({ t: 'chat', text: `m${i}` }), T0 + 10);
    expect(sent(e.message('ana', msg({ t: 'chat', text: 'flood' }), T0 + 20), 'ana')).toEqual([{ t: 'error', code: 'chat_rate_limited' }]);
  });

  it('blocks chat for muted users and lets moderators delete messages', () => {
    const e = room();
    e.join(claims('ana', { chat: false }), T0);
    e.join(claims('bia'), T0);
    expect(sent(e.message('ana', msg({ t: 'chat', text: 'oi' }), T0), 'ana')).toEqual([{ t: 'error', code: 'chat_forbidden' }]);
    e.message('bia', msg({ t: 'chat', text: 'oi' }), T0);
    const id = e.state.chat[0]!.id;
    expect(types(e.message('ana', msg({ t: 'chat_delete', id }), T0), 'ana')).toEqual(['error']);
    expect(types(e.message('owner', msg({ t: 'chat_delete', id }), T0), 'bia')).toEqual(['chat_deleted']);
  });

  it('kicks with permission and reports it; moderators cannot kick moderators', () => {
    const e = room();
    e.join(claims('m1', { role: 'moderator', mod: OWNER_PERMS }), T0);
    e.join(claims('m2', { role: 'moderator', mod: OWNER_PERMS }), T0);
    e.join(claims('ana'), T0);
    expect(types(e.message('m1', msg({ t: 'kick', to: 'm2' }), T0), 'm1')).toEqual(['error']);
    expect(types(e.message('ana', msg({ t: 'kick', to: 'm1' }), T0), 'ana')).toEqual(['error']);
    const fx = e.message('m1', msg({ t: 'kick', to: 'ana' }), T0);
    expect(sent(fx, 'ana')).toEqual([{ t: 'removed', reason: 'kick' }]);
    expect(fx).toContainEqual({ k: 'event', event: { type: 'kicked', sessionId: SID, profileId: 'ana', by: 'm1' } });
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
    expect(e.state.members['ana']).toMatchObject({ connected: true, streaming: true });
  });

  it('forgets members that do not come back and reports they left', () => {
    const e = room();
    e.join(claims('ana'), T0);
    e.disconnect('ana', T0);
    e.message('owner', msg({ t: 'ping' }), T0 + RECONNECT_GRACE_MS);
    const fx = e.alarm(T0 + RECONNECT_GRACE_MS);
    expect(types(fx, 'owner')).toContain('left');
    expect(fx).toContainEqual({ k: 'event', event: { type: 'left', sessionId: SID, profileId: 'ana' } });
  });

  it('ends the session when the owner stays away past the grace window', () => {
    const e = room();
    e.join(claims('ana'), T0);
    e.disconnect('owner', T0);
    e.message('ana', msg({ t: 'ping' }), T0 + 59_000);
    expect(e.alarm(T0 + 59_000).some((f) => f.k === 'event')).toBe(false);
    e.message('ana', msg({ t: 'ping' }), T0 + 60_000);
    const fx = e.alarm(T0 + 60_000);
    expect(sent(fx, 'ana')).toEqual([{ t: 'session_end', reason: 'owner_timeout' }]);
    expect(fx).toContainEqual({ k: 'event', event: { type: 'ended', sessionId: SID, reason: 'owner_timeout' } });
    expect(e.state.ended).toBe('owner_timeout');
    expect(e.state.chat).toEqual([]);
  });

  it('ends everything when the owner stops streaming, and at max duration', () => {
    const e = room();
    e.join(claims('ana'), T0);
    e.message('ana', msg({ t: 'chat', text: 'oi' }), T0);
    const fx = e.message('owner', msg({ t: 'stream_stop' }), T0);
    expect(sent(fx, 'ana')).toEqual([{ t: 'session_end', reason: 'owner_ended' }]);
    expect(fx.filter((f) => f.k === 'close').map((f) => (f as { to: string }).to).sort()).toEqual(['ana', 'owner']);
    expect(e.state.chat).toEqual([]);

    const timed = room();
    expect(timed.alarm(cfg.endsAt * 1000)).toContainEqual({
      k: 'event',
      event: { type: 'ended', sessionId: SID, reason: 'max_duration' },
    });
  });

  it('drops sockets with expired tokens and silent sockets', () => {
    const e = room();
    e.join(claims('ana', { exp: T0 / 1000 }), T0);
    expect(sent(e.message('ana', msg({ t: 'ping' }), T0 + 200_000), 'ana')).toEqual([{ t: 'removed', reason: 'token_expired' }]);

    const quiet = room();
    quiet.join(claims('bia'), T0);
    const fx = quiet.alarm(T0 + 45_000);
    expect(fx).toContainEqual({ k: 'close', to: 'bia', code: 4002, reason: 'invalid' });
  });

  it('applies backend commands: ban removal, refresh and end', () => {
    const e = room();
    e.join(claims('ana'), T0);
    expect(types(e.internal({ action: 'refresh', profileId: 'ana' }), 'ana')).toEqual(['refresh_token']);
    expect(sent(e.internal({ action: 'remove', profileId: 'ana', reason: 'ban' }), 'ana')).toEqual([{ t: 'removed', reason: 'ban' }]);
    const end = e.internal({ action: 'end', reason: 'sanction' });
    expect(end.some((f) => f.k === 'event')).toBe(false);
    expect(e.state.ended).toBe('sanction');
  });
});
