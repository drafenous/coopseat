import { randomUUID } from 'node:crypto';

/**
 * In-memory stand-in for the subset of the Prisma ORM API the server uses:
 * where(object | predicate builder), first, create, updateAll, deleteAll, aggregate(count).
 */
type Row = Record<string, unknown>;
type Predicate = (row: Row) => boolean;

const field = (name: string) => ({
  eq:
    (v: unknown): Predicate =>
    (r) =>
      r[name] === v,
  neq:
    (v: unknown): Predicate =>
    (r) =>
      r[name] !== v,
  gte:
    (v: string): Predicate =>
    (r) =>
      String(r[name]) >= v,
  in:
    (vs: unknown[]): Predicate =>
    (r) =>
      vs.includes(r[name]),
  isNull: (): Predicate => (r) => r[name] === null || r[name] === undefined,
});
const fields = new Proxy(
  {},
  { get: (_t, name: string) => field(name) },
) as Record<string, ReturnType<typeof field>>;

const uniqueViolation = () =>
  Object.assign(new Error('duplicate key'), { code: '23505' });

function table(
  rows: Row[],
  defaults: () => Row,
  validate: (rows: Row[]) => boolean = () => true,
) {
  const query = (preds: Predicate[]) => {
    const match = () => rows.filter((r) => preds.every((p) => p(r)));
    return {
      where(cond: Row | ((h: typeof fields) => Predicate)) {
        const pred: Predicate =
          typeof cond === 'function'
            ? cond(fields)
            : (r) => Object.entries(cond).every(([k, v]) => r[k] === v);
        return query([...preds, pred]);
      },
      select() {
        return query(preds);
      },
      async first() {
        return match()[0] ?? null;
      },
      async all() {
        return match();
      },
      async updateAll(data: Row) {
        const hit = match();
        const before = hit.map((r) => ({ ...r }));
        for (const r of hit) Object.assign(r, data);
        if (!validate(rows)) {
          hit.forEach((r, i) => Object.assign(r, before[i]));
          throw uniqueViolation();
        }
        return hit;
      },
      async deleteAll() {
        const hit = match();
        for (const r of hit) rows.splice(rows.indexOf(r), 1);
        return hit;
      },
      async aggregate(fn: (a: { count(): string }) => Record<string, string>) {
        const shape = fn({ count: () => 'count' });
        return Object.fromEntries(
          Object.keys(shape).map((k) => [k, match().length]),
        );
      },
      async create(data: Row) {
        const row = { ...defaults(), ...data };
        rows.push(row);
        if (!validate(rows)) {
          rows.pop();
          throw uniqueViolation();
        }
        return row;
      },
    };
  };
  return query([]);
}

/** Mirrors the partial unique index identity_verifications_fingerprint_approved. */
function approvedFingerprintsUnique(rows: Row[]): boolean {
  const seen = rows
    .filter((r) => r.status === 'approved' && r.documentFingerprint)
    .map((r) => r.documentFingerprint);
  return new Set(seen).size === seen.length;
}

/** Mirrors the (roomId, profileId) unique constraints of the party_room_* tables. */
function roomProfileUnique(rows: Row[]): boolean {
  const keys = rows.map((r) => `${r.roomId}:${r.profileId}`);
  return new Set(keys).size === keys.length;
}

/** Mirrors the partial unique index party_sessions_one_active. */
function oneActiveSession(rows: Row[]): boolean {
  const active = rows.filter((r) => r.endedAt === null).map((r) => r.roomId);
  return new Set(active).size === active.length;
}

export function createFakeDb() {
  const now = () => new Date().toISOString();
  const data = {
    AuthTicket: [] as Row[],
    RateLimitHit: [] as Row[],
    Profile: [] as Row[],
    IdentityVerification: [] as Row[],
    RelayPolicy: [] as Row[],
    RelayUserOverride: [] as Row[],
    RelayCredential: [] as Row[],
    RelayUsage: [] as Row[],
    PartyPolicy: [] as Row[],
    PartyRoom: [] as Row[],
    PartyRoomWhitelist: [] as Row[],
    PartyRoomModerator: [] as Row[],
    PartyRoomBan: [] as Row[],
    PartySession: [] as Row[],
    PartySessionParticipant: [] as Row[],
    PartyModerationEvent: [] as Row[],
    PlatformSanction: [] as Row[],
  };
  const orm = {
    public: {
      get AuthTicket() {
        return table(data.AuthTicket, () => ({ createdAt: now() }));
      },
      get RateLimitHit() {
        return table(data.RateLimitHit, () => ({
          id: randomUUID(),
          createdAt: now(),
        }));
      },
      get Profile() {
        return table(data.Profile, () => ({
          nickname: null,
          nicknameKey: null,
          nicknameChangedAt: null,
          avatarUrl: null,
          ageStatus: 'UNVERIFIED',
          ageVerifiedAt: null,
          termsVersion: null,
          termsAcceptedAt: null,
          createdAt: now(),
          updatedAt: now(),
        }));
      },
      get IdentityVerification() {
        return table(
          data.IdentityVerification,
          () => ({
            id: randomUUID(),
            status: 'created',
            isAdult: null,
            documentFingerprint: null,
            failureReason: null,
            createdAt: now(),
            completedAt: null,
          }),
          approvedFingerprintsUnique,
        );
      },
      get RelayPolicy() {
        return table(data.RelayPolicy, () => ({
          id: 'global',
          enabled: true,
          membersEnabled: true,
          guestsEnabled: true,
          minAppVersion: null,
          blockedAppVersions: null,
          dailyCredentialQuota: 12,
          credentialTtlSeconds: 14400,
          maxRelayBitrateKbps: 4000,
          monthlyBudgetGb: 900,
          note: null,
          updatedAt: now(),
        }));
      },
      get RelayUserOverride() {
        return table(data.RelayUserOverride, () => ({
          blocked: false,
          dailyQuota: null,
          reason: null,
          expiresAt: null,
          createdAt: now(),
        }));
      },
      get RelayCredential() {
        return table(data.RelayCredential, () => ({
          id: randomUUID(),
          appVersion: null,
          issuedAt: now(),
          revokedAt: null,
        }));
      },
      get RelayUsage() {
        return table(data.RelayUsage, () => ({}));
      },
      get PartyPolicy() {
        return table(data.PartyPolicy, () => ({
          id: 'global',
          enabled: true,
          maxParticipants: 10,
          maxStreamers: 10,
          sessionMaxHours: 12,
          ownerGraceSeconds: 60,
          chatEnabled: true,
          note: null,
          updatedAt: now(),
        }));
      },
      get PartyRoom() {
        return table(data.PartyRoom, () => ({
          passwordHash: null,
          requireApproval: true,
          whitelistEnabled: false,
          defaultLayout: 'stage',
          maxParticipants: null,
          createdAt: now(),
          updatedAt: now(),
        }));
      },
      get PartyRoomWhitelist() {
        return table(
          data.PartyRoomWhitelist,
          () => ({ id: randomUUID(), canStream: false, createdAt: now() }),
          roomProfileUnique,
        );
      },
      get PartyRoomModerator() {
        return table(
          data.PartyRoomModerator,
          () => ({
            id: randomUUID(),
            canKick: true,
            canBan: false,
            canStopStreams: true,
            canApprove: true,
            canGrantStream: false,
            canDeleteMessages: true,
            createdAt: now(),
          }),
          roomProfileUnique,
        );
      },
      get PartyRoomBan() {
        return table(
          data.PartyRoomBan,
          () => ({
            id: randomUUID(),
            reason: null,
            expiresAt: null,
            createdAt: now(),
          }),
          roomProfileUnique,
        );
      },
      get PartySession() {
        return table(
          data.PartySession,
          () => ({
            id: randomUUID(),
            startedAt: now(),
            endedAt: null,
            endReason: null,
          }),
          oneActiveSession,
        );
      },
      get PartySessionParticipant() {
        return table(data.PartySessionParticipant, () => ({
          id: randomUUID(),
          joinedAt: now(),
          leftAt: null,
          removal: null,
          removedBy: null,
        }));
      },
      get PartyModerationEvent() {
        return table(data.PartyModerationEvent, () => ({
          id: randomUUID(),
          sessionId: null,
          targetId: null,
          detail: null,
          createdAt: now(),
        }));
      },
      get PlatformSanction() {
        return table(data.PlatformSanction, () => ({
          id: randomUUID(),
          reason: null,
          expiresAt: null,
          createdBy: null,
          createdAt: now(),
          revokedAt: null,
        }));
      },
    },
  };
  return { data, db: { orm } };
}

export type FakeDb = ReturnType<typeof createFakeDb>;
