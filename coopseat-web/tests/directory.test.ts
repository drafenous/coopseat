import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRoomQuery } from '@coopseat/ui/party-protocol';
import { ApiError } from '@/server/http';
import {
  ROOM_PAGE_SIZE,
  listRooms,
  lookupRoom,
} from '@/server/party/directory';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
  tryLockedRateLimit: async () => 'unsupported' as const,
}));

const tables = () => fake.current.db.orm.public;
const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 3600 * 1000).toISOString();

async function profile(id: string, nickname: string) {
  await tables().Profile.create({
    id,
    nickname,
    nicknameKey: nickname.toLowerCase(),
  });
}

describe('parseRoomQuery', () => {
  it('reads a nickname, a site path and a desktop link', () => {
    expect(parseRoomQuery('  Rodri_99 ')).toBe('Rodri_99');
    expect(parseRoomQuery('/party/Rodri_99')).toBe('Rodri_99');
    expect(parseRoomQuery('/pt-BR/party/Rodri_99/')).toBe('Rodri_99');
    expect(parseRoomQuery('https://coopseat.com/party/Rodri_99?x=1')).toBe(
      'Rodri_99',
    );
    expect(parseRoomQuery('coopseat://party/Rodri_99')).toBe('Rodri_99');
    expect(parseRoomQuery('coopseat.com/pt-BR/party/Rodri_99')).toBe('Rodri_99');
  });

  it('rejects anything that is not one room', () => {
    for (const raw of [
      '',
      'ab',
      'has space',
      '/party/Rodri_99/extra',
      'https://coopseat.com/play',
      'coopseat://auth/linked',
      'javascript:alert(1)',
    ])
      expect(parseRoomQuery(raw)).toBeNull();
  });
});

describe('room directory', () => {
  beforeEach(() => {
    fake.current = createFakeDb();
  });

  async function hostRoom(
    extra: Record<string, unknown> = {},
    session: { startedAt?: string } | null = {},
  ) {
    await profile('host-1', 'Host');
    await tables().PartyRoom.create({
      ownerId: 'host-1',
      passwordHash: 'hash',
      requireApproval: false,
      whitelistEnabled: true,
      listed: true,
      ...extra,
    });
    if (!session) return null;
    return tables().PartySession.create({
      roomId: 'host-1',
      ...session,
    });
  }

  it('looks up an unlisted room and counts only people still inside', async () => {
    const session = await hostRoom({ listed: false });
    await tables().PartySessionParticipant.create({
      sessionId: session!.id,
      profileId: 'host-1',
    });
    await tables().PartySessionParticipant.create({
      sessionId: session!.id,
      profileId: 'guest-1',
      leftAt: new Date().toISOString(),
    });
    await tables().PartySessionParticipant.create({
      sessionId: session!.id,
      profileId: 'guest-2',
      removal: 'kick',
      leftAt: new Date().toISOString(),
    });

    await tables()
      .Profile.where({ id: 'host-1' })
      .updateAll({ avatarUrl: 'https://cdn.example/host.png' });

    const room = await lookupRoom('https://coopseat.com/party/host');
    expect(room).toEqual({
      nickname: 'Host',
      avatarUrl: 'https://cdn.example/host.png',
      open: true,
      people: 1,
      capacity: 10,
      hasPassword: true,
      requireApproval: false,
      inviteOnly: true,
    });
    expect(await listRooms('all')).toEqual({
      rooms: [],
      total: 0,
      page: 1,
      pageSize: ROOM_PAGE_SIZE,
    });
  });

  it('lists only opted-in rooms and splits open from closed', async () => {
    await hostRoom();
    await profile('late-1', 'Late');
    await tables().PartyRoom.create({
      ownerId: 'late-1',
      listed: true,
      requireApproval: true,
      whitelistEnabled: true,
    });
    await tables().PartySession.create({
      roomId: 'late-1',
      startedAt: hoursAgo(13),
    });

    await tables()
      .Profile.where({ id: 'host-1' })
      .updateAll({ avatarUrl: 'https://cdn.example/host.png' });
    const open = await listRooms('open');
    expect(open.rooms.map((room) => room.nickname)).toEqual(['Host']);
    expect(open.rooms[0]?.avatarUrl).toBe('https://cdn.example/host.png');
    expect((await listRooms('closed')).rooms.map((room) => room.nickname)).toEqual([
      'Late',
    ]);
    expect((await listRooms('all')).rooms.map((room) => room.nickname)).toEqual([
      'Host',
      'Late',
    ]);
  });

  it('returns one page and keeps the open-first order', async () => {
    for (let i = 0; i < ROOM_PAGE_SIZE + 1; i++) {
      const id = `page-${i}`;
      const nickname = `Host${String(i).padStart(2, '0')}`;
      await profile(id, nickname);
      await tables().PartyRoom.create({
        ownerId: id,
        listed: true,
        requireApproval: true,
        whitelistEnabled: false,
      });
    }
    const first = await listRooms('closed', 1);
    expect(first.total).toBe(ROOM_PAGE_SIZE + 1);
    expect(first.rooms).toHaveLength(ROOM_PAGE_SIZE);
    expect(first.rooms[0]?.nickname).toBe('Host00');
    expect(first.rooms.at(-1)?.nickname).toBe('Host19');
    const second = await listRooms('closed', 2);
    expect(second.rooms.map((room) => room.nickname)).toEqual(['Host20']);
    expect(second.page).toBe(2);
  });

  it('filters by password and by visibility', async () => {
    await hostRoom();
    await profile('late-1', 'Late');
    await tables().PartyRoom.create({
      ownerId: 'late-1',
      listed: true,
      requireApproval: true,
      whitelistEnabled: true,
    });
    await profile('pub-1', 'Public');
    await tables().PartyRoom.create({
      ownerId: 'pub-1',
      listed: true,
      passwordHash: null,
      requireApproval: false,
      whitelistEnabled: false,
    });

    const names = async (
      restrictions: Parameters<typeof listRooms>[2],
    ) =>
      (await listRooms('all', 1, restrictions)).rooms.map((room) => room.nickname);

    expect(await names({ password: 'yes' })).toEqual(['Host']);
    expect(await names({ password: 'no' })).toEqual(['Late', 'Public']);
    expect(await names({ visibility: 'private' })).toEqual(['Host']);
    expect(await names({ visibility: 'protected' })).toEqual(['Late']);
    expect(await names({ visibility: 'public' })).toEqual(['Public']);
    expect(await names({ password: 'yes', visibility: 'public' })).toEqual([]);
    expect(await names({ visibility: ['protected', 'public'] })).toEqual([
      'Late',
      'Public',
    ]);
  });

  it('treats a nickname with no room row as closed, and unknown names as missing', async () => {
    await profile('new-1', 'New_User');
    expect(await lookupRoom('New_User')).toMatchObject({
      nickname: 'New_User',
      open: false,
      people: 0,
      hasPassword: false,
      requireApproval: true,
      inviteOnly: false,
    });
    await expect(lookupRoom('Missing')).rejects.toMatchObject({
      status: 404,
      code: 'party_not_found',
    });
    await expect(lookupRoom('no')).rejects.toBeInstanceOf(ApiError);
  });
});
