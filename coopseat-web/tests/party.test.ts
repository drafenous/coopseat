import { SignJWT } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  internalHeaders,
  OWNER_PERMS,
  sanitizeChat,
  toPem,
  verifyInternal,
  type RoomTokenClaims,
} from '@coopseat/ui/party-protocol';
import { permissionsFor, type GateInput } from '@/lib/gates';
import {
  assertCanTarget,
  decideAccess,
  openLiveSession,
  type AccessResult,
  type Viewer,
} from '@/server/party/access';
import { hashRoomPassword, verifyRoomPassword } from '@/server/party/password';
import { activeSanctions, isBlocked } from '@/server/party/sanctions';
import {
  signRoomToken,
  verifyRoomToken,
  type RoomTokenInput,
} from '@/server/party/tokens';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
}));

const OWNER = { id: 'owner-1', nickname: 'Host' };
const verified: GateInput = {
  emailConfirmed: true,
  nicknameSet: true,
  ageVerified: true,
  mfaEnabled: false,
  aal: 'aal1',
};
const viewer = (profileId: string, gates: Partial<GateInput> = {}): Viewer => ({
  profileId,
  nickname: profileId,
  permissions: permissionsFor({ ...verified, ...gates }),
});
const tables = () => fake.current.db.orm.public;
const later = (ms: number) => new Date(Date.now() + ms).toISOString();

async function liveRoom(room: Record<string, unknown> = {}) {
  await tables().PartyRoom.create({ ownerId: OWNER.id, ...room });
  return tables().PartySession.create({ roomId: OWNER.id });
}

const access = (
  v: Viewer,
  extra: { password?: string; expectedSessionId?: string } = {},
) => decideAccess({ viewer: v, owner: OWNER, ...extra });

function admitted(result: AccessResult) {
  if (result.state !== 'admitted' && result.state !== 'pending')
    throw new Error(`unexpected ${result.state}`);
  return result;
}

describe('decideAccess', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fake.current = createFakeDb();
    fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('closes every room when the policy is off', async () => {
    await liveRoom();
    await tables().PartyPolicy.create({ enabled: false });
    expect(await access(viewer('owner-1'))).toEqual({ state: 'disabled' });
  });

  it('keeps unverified and sanctioned users out', async () => {
    await liveRoom();
    expect(await access(viewer('u1', { ageVerified: false }))).toEqual({
      state: 'requirements',
      missing: ['age'],
    });
    await tables().PlatformSanction.create({
      profileId: 'u2',
      scope: 'party_join',
    });
    expect(await access(viewer('u2'))).toEqual({ state: 'unavailable' });
    await tables().PlatformSanction.create({
      profileId: 'u3',
      scope: 'platform',
    });
    expect(await access(viewer('u3'))).toEqual({ state: 'unavailable' });
  });

  it('reports offline rooms and tells the owner it is theirs', async () => {
    expect(await access(viewer('u1'))).toEqual({
      state: 'offline',
      isOwner: false,
      canOpen: false,
    });
    expect(await access(viewer(OWNER.id))).toEqual({
      state: 'offline',
      isOwner: true,
      canOpen: true,
    });
  });

  it('lets a durable streamer open a closed room, and nobody else', async () => {
    await tables().PartyRoom.create({
      ownerId: OWNER.id,
      requireApproval: false,
      whitelistEnabled: true,
    });
    await tables().PartyRoomWhitelist.create({
      roomId: OWNER.id,
      profileId: 'u1',
      canStream: true,
    });
    await tables().PartyRoomWhitelist.create({
      roomId: OWNER.id,
      profileId: 'u2',
      canStream: false,
    });
    await tables().PartyRoomModerator.create({
      roomId: OWNER.id,
      profileId: 'mod',
    });
    expect(await access(viewer('u1'))).toEqual({
      state: 'offline',
      isOwner: false,
      canOpen: true,
    });
    expect(await access(viewer('u2'))).toEqual({
      state: 'offline',
      isOwner: false,
      canOpen: false,
    });
    expect(await access(viewer('mod'))).toMatchObject({
      state: 'offline',
      canOpen: false,
    });

    const opened = await openLiveSession({
      viewer: viewer('u1'),
      owner: OWNER,
    });
    expect(opened.state).toBe('admitted');
    if (opened.state === 'admitted')
      expect(opened.claims.canStream).toBe(true);
    expect(fake.current.data.PartySession).toHaveLength(1);

    await expect(
      openLiveSession({ viewer: viewer('u3'), owner: OWNER }),
    ).rejects.toMatchObject({ status: 403, code: 'party_forbidden' });
    expect(fake.current.data.PartySession).toHaveLength(1);
    expect(await access(viewer('u3'))).toEqual({ state: 'not_invited' });
  });

  it('treats a stale session id as offline (the session ended and another started)', async () => {
    await liveRoom();
    expect(
      (await access(viewer(OWNER.id), { expectedSessionId: 'old-session' }))
        .state,
    ).toBe('offline');
  });

  it('ends sessions that outlived the maximum duration', async () => {
    const session = await liveRoom();
    session.startedAt = new Date(Date.now() - 13 * 3600_000).toISOString();
    expect((await access(viewer('u1'))).state).toBe('offline');
    expect(fake.current.data.PartySession[0]).toMatchObject({
      endReason: 'max_duration',
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('admits the owner with every permission, but host sanctions block streaming', async () => {
    const session = await liveRoom();
    const result = admitted(await access(viewer(OWNER.id)));
    expect(result).toMatchObject({ state: 'admitted', sessionId: session.id });
    expect(result.claims).toMatchObject({
      role: 'owner',
      canStream: true,
      streamBlocked: false,
      mod: OWNER_PERMS,
    });

    await tables().PlatformSanction.create({
      profileId: OWNER.id,
      scope: 'party_host',
    });
    expect(admitted(await access(viewer(OWNER.id))).claims.streamBlocked).toBe(
      true,
    );
  });

  it('blocks streaming when the 2FA host gate fails', async () => {
    await liveRoom();
    const result = admitted(
      await access(viewer(OWNER.id, { mfaEnabled: true, aal: 'aal1' })),
    );
    expect(result.claims.streamBlocked).toBe(true);
  });

  it('keeps banned users out until the ban expires', async () => {
    await liveRoom({ requireApproval: false, whitelistEnabled: true });
    await tables().PartyRoomBan.create({
      roomId: OWNER.id,
      profileId: 'u1',
      expiresAt: later(60_000),
    });
    expect(await access(viewer('u1'))).toEqual({ state: 'banned' });
    fake.current.data.PartyRoomBan[0]!.expiresAt = later(-1000);
    expect(await access(viewer('u1'))).toEqual({ state: 'not_invited' });
  });

  it('admits allow-listed users directly, with streaming when the entry allows it', async () => {
    await liveRoom({ requireApproval: false, whitelistEnabled: true });
    await tables().PartyRoomWhitelist.create({
      roomId: OWNER.id,
      profileId: 'u1',
      canStream: true,
    });
    expect(admitted(await access(viewer('u1'))).claims).toMatchObject({
      role: 'member',
      canStream: true,
      status: 'admitted',
    });
    expect(await access(viewer('u2'))).toEqual({ state: 'not_invited' });
  });

  it('asks for the password, rejects a wrong one, then queues for approval', async () => {
    await liveRoom({ passwordHash: await hashRoomPassword('s3cret!') });
    expect(await access(viewer('u1'))).toEqual({ state: 'password_required' });
    await expect(
      access(viewer('u1'), { password: 'nope' }),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      admitted(await access(viewer('u1'), { password: 's3cret!' })).state,
    ).toBe('pending');
  });

  it('admits with the password alone in a public room', async () => {
    const session = await liveRoom({
      passwordHash: await hashRoomPassword('pw-123'),
      requireApproval: false,
      whitelistEnabled: false,
    });
    expect(
      admitted(await access(viewer('u1'), { password: 'pw-123' })).state,
    ).toBe('admitted');
    expect(fake.current.data.PartySessionParticipant).toEqual([
      expect.objectContaining({
        sessionId: session.id,
        profileId: 'u1',
        removal: null,
      }),
    ]);
  });

  it('admits anyone immediately in a public room without a password', async () => {
    const session = await liveRoom({
      requireApproval: false,
      whitelistEnabled: false,
    });
    expect(admitted(await access(viewer('u1'))).state).toBe('admitted');
    expect(fake.current.data.PartySessionParticipant).toEqual([
      expect.objectContaining({
        sessionId: session.id,
        profileId: 'u1',
        removal: null,
      }),
    ]);
  });

  it('queues strangers in a protected room and lets the allow list bypass', async () => {
    await liveRoom({ requireApproval: true, whitelistEnabled: true });
    expect(admitted(await access(viewer('u1'))).state).toBe('pending');
    await tables().PartyRoomWhitelist.create({
      roomId: OWNER.id,
      profileId: 'u2',
      canStream: false,
    });
    expect(admitted(await access(viewer('u2'))).state).toBe('admitted');
  });

  it('lets a durable streamer open a public room via the allow list', async () => {
    await tables().PartyRoom.create({
      ownerId: OWNER.id,
      requireApproval: false,
      whitelistEnabled: false,
    });
    await tables().PartyRoomWhitelist.create({
      roomId: OWNER.id,
      profileId: 'u1',
      canStream: true,
    });
    expect(await access(viewer('u1'))).toEqual({
      state: 'offline',
      isOwner: false,
      canOpen: true,
    });
    const opened = await openLiveSession({
      viewer: viewer('u1'),
      owner: OWNER,
    });
    expect(opened.state).toBe('admitted');
    if (opened.state === 'admitted') expect(opened.claims.canStream).toBe(true);
  });

  it('lets admitted participants back in without protections until they are kicked', async () => {
    const session = await liveRoom();
    await tables().PartySessionParticipant.create({
      sessionId: session.id,
      profileId: 'u1',
    });
    expect(admitted(await access(viewer('u1'))).state).toBe('admitted');

    fake.current.data.PartySessionParticipant[0]!.removal = 'kick';
    expect(admitted(await access(viewer('u1'))).state).toBe('pending');
  });

  it('admits moderators with their own permission set', async () => {
    await liveRoom();
    await tables().PartyRoomModerator.create({
      roomId: OWNER.id,
      profileId: 'mod',
      canBan: true,
    });
    const { claims } = admitted(await access(viewer('mod')));
    expect(claims.role).toBe('moderator');
    expect(claims.mod).toEqual({
      kick: true,
      ban: true,
      stopStreams: true,
      approve: true,
      grantStream: false,
      deleteMessages: true,
    });
  });

  it('freezes room limits and chat into the token claims', async () => {
    await liveRoom({ maxParticipants: 4 });
    await tables().PartyPolicy.create({ chatEnabled: false, maxStreamers: 50 });
    const { claims } = admitted(await access(viewer(OWNER.id)));
    expect(claims.cfg).toMatchObject({ cap: 4, maxStreamers: 10, chat: false });
    expect(claims.chat).toBe(false);
  });
});

describe('moderation hierarchy', () => {
  beforeEach(async () => {
    fake.current = createFakeDb();
    await tables().PartyRoomModerator.create({
      roomId: OWNER.id,
      profileId: 'mod-a',
    });
    await tables().PartyRoomModerator.create({
      roomId: OWNER.id,
      profileId: 'mod-b',
    });
  });
  const owner = { role: 'owner' as const, perms: OWNER_PERMS };
  const moderator = { role: 'moderator' as const, perms: OWNER_PERMS };

  it('never lets anyone act on the owner', async () => {
    await expect(
      assertCanTarget(OWNER.id, owner, OWNER.id),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      assertCanTarget(OWNER.id, moderator, OWNER.id),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('lets the owner act on moderators but not moderators on each other', async () => {
    await expect(
      assertCanTarget(OWNER.id, owner, 'mod-a'),
    ).resolves.toBeUndefined();
    await expect(
      assertCanTarget(OWNER.id, moderator, 'mod-b'),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      assertCanTarget(OWNER.id, moderator, 'member'),
    ).resolves.toBeUndefined();
  });
});

describe('platform sanctions', () => {
  beforeEach(() => {
    fake.current = createFakeDb();
  });

  it('ignores revoked and expired sanctions; platform implies every scope', async () => {
    await tables().PlatformSanction.create({
      profileId: 'u1',
      scope: 'party_chat',
      revokedAt: later(-1),
    });
    await tables().PlatformSanction.create({
      profileId: 'u1',
      scope: 'party_stream',
      expiresAt: later(-1000),
    });
    await tables().PlatformSanction.create({
      profileId: 'u1',
      scope: 'party_host',
      expiresAt: later(60_000),
    });
    const scopes = await activeSanctions('u1');
    expect([...scopes]).toEqual(['party_host']);
    expect(isBlocked(scopes, 'party_chat')).toBe(false);
    expect(isBlocked(new Set(['platform']), 'party_chat')).toBe(true);
  });
});

describe('room tokens', () => {
  const claims: RoomTokenInput = {
    sid: 'session-1',
    rid: OWNER.id,
    sub: 'u1',
    nick: 'u1',
    role: 'member',
    status: 'admitted',
    canStream: false,
    streamBlocked: false,
    chat: true,
    mod: null,
    cfg: {
      cap: 10,
      maxStreamers: 10,
      ownerGraceSeconds: 60,
      endsAt: 0,
      chat: true,
    },
  };

  it('round-trips the claims with a short expiry', async () => {
    const { token, expiresAt } = await signRoomToken(claims);
    const verifiedClaims = (await verifyRoomToken(token)) as RoomTokenClaims;
    expect(verifiedClaims).toMatchObject(claims);
    expect(verifiedClaims.exp).toBe(expiresAt);
    expect(expiresAt - Date.now() / 1000).toBeLessThanOrEqual(600);
  });

  it('rejects tampered tokens and tokens signed with another key or algorithm', async () => {
    const { token } = await signRoomToken(claims);
    const [h, p, s] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...claims, role: 'owner' }),
    ).toString('base64url');
    expect(await verifyRoomToken(`${h}.${forged}.${s}`)).toBeNull();
    expect(await verifyRoomToken(`${h}.${p}.`)).toBeNull();

    const hs256 = await new SignJWT({ ...claims })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('coopseat-web')
      .setAudience('coopseat-signal')
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('x'.repeat(32)));
    expect(await verifyRoomToken(hs256)).toBeNull();
  });
});

describe('toPem', () => {
  it('accepts PEM with escaped newlines or just the base64 body', async () => {
    const { generateKeyPairSync, createPublicKey } =
      await import('node:crypto');
    const { publicKey } = generateKeyPairSync('ed25519');
    const pemText = publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
    const body = publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64');
    for (const value of [pemText, pemText.replace(/\n/g, '\\n'), body]) {
      expect(
        createPublicKey(toPem(value, 'PUBLIC KEY')).asymmetricKeyType,
      ).toBe('ed25519');
    }
  });
});

describe('room passwords', () => {
  it('hashes with a random salt and verifies in constant time', async () => {
    const a = await hashRoomPassword('Senha forte');
    const b = await hashRoomPassword('Senha forte');
    expect(a).not.toBe(b);
    expect(a.startsWith('scrypt$')).toBe(true);
    expect(await verifyRoomPassword('Senha forte', a)).toBe(true);
    expect(await verifyRoomPassword('senha forte', a)).toBe(false);
    expect(await verifyRoomPassword('Senha forte', 'plain')).toBe(false);
  });
});

describe('internal HMAC', () => {
  const headersOf = (h: Record<string, string>) => new Headers(h);

  it('accepts signed bodies and rejects tampering, other secrets and stale timestamps', async () => {
    const body = JSON.stringify({ action: 'end', reason: 'operator' });
    const signed = await internalHeaders('secret', body);
    expect(await verifyInternal('secret', headersOf(signed), body)).toEqual({
      nonce: signed['x-coopseat-nonce'],
    });
    expect(
      await verifyInternal(
        'secret',
        headersOf(signed),
        body.replace('operator', 'sanction'),
      ),
    ).toBeNull();
    expect(await verifyInternal('other', headersOf(signed), body)).toBeNull();
    expect(
      await verifyInternal(
        'secret',
        headersOf(signed),
        body,
        Date.now() + 120_000,
      ),
    ).toBeNull();
  });
});

describe('chat sanitizing', () => {
  it('strips control and bidi characters and collapses whitespace', () => {
    expect(sanitizeChat('  oi\u202E  <b>todos</b>\u0007 ')).toBe(
      'oi <b>todos</b>',
    );
    expect(sanitizeChat('   ')).toBeNull();
    expect(sanitizeChat(42)).toBeNull();
  });

  it('counts emoji as one character each and caps at 200', () => {
    const family = '👨‍👩‍👧‍👦';
    expect(sanitizeChat(family.repeat(200))).toBe(family.repeat(200));
    expect(sanitizeChat(family.repeat(201))).toBeNull();
    expect(sanitizeChat('a'.repeat(201))).toBeNull();
  });
});
