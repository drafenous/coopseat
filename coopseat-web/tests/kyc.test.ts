import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyVerificationResult,
  documentFingerprint,
  startVerification,
} from '@/server/identity/service';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
}));

const doc = { country: 'br', number: '123.456.789-09' };
const approved = (sessionId: string) => ({
  sessionId,
  status: 'approved' as const,
  isAdult: true,
  document: doc,
});

async function start(profileId: string) {
  const { url } = await startVerification(
    profileId,
    'https://coopseat.com/account',
  );
  const row = fake.current.data.IdentityVerification.at(-1)!;
  return { url, sessionId: String(row.providerSessionId) };
}

describe('age verification', () => {
  beforeEach(() => {
    fake.current = createFakeDb();
    fake.current.data.Profile.push(
      { id: 'p1', ageStatus: 'UNVERIFIED' },
      { id: 'p2', ageStatus: 'UNVERIFIED' },
    );
  });

  it('normalizes the document before fingerprinting', () => {
    expect(documentFingerprint('BR', '12345678909')).toBe(
      documentFingerprint(' br ', '123.456.789-09'),
    );
    expect(documentFingerprint('BR', '12345678909')).not.toBe(
      documentFingerprint('PT', '12345678909'),
    );
  });

  it('marks the profile pending, then verified, and is idempotent', async () => {
    const { sessionId } = await start('p1');
    expect(fake.current.data.Profile[0]!.ageStatus).toBe('PENDING');
    expect(
      await applyVerificationResult('mock', approved(sessionId)),
    ).toMatchObject({ applied: true, status: 'approved' });
    expect(fake.current.data.Profile[0]!.ageStatus).toBe('VERIFIED');
    expect(
      await applyVerificationResult('mock', approved(sessionId)),
    ).toMatchObject({ applied: false, reason: 'already_completed' });
    expect(fake.current.data.IdentityVerification[0]).not.toHaveProperty(
      'document',
    );
  });

  it('rejects minors', async () => {
    const { sessionId } = await start('p1');
    await applyVerificationResult('mock', {
      ...approved(sessionId),
      isAdult: false,
    });
    expect(fake.current.data.Profile[0]!.ageStatus).toBe('REJECTED');
    expect(fake.current.data.IdentityVerification[0]!.failureReason).toBe(
      'underage',
    );
  });

  it('does not let one document verify two accounts', async () => {
    await applyVerificationResult(
      'mock',
      approved((await start('p1')).sessionId),
    );
    const result = await applyVerificationResult(
      'mock',
      approved((await start('p2')).sessionId),
    );
    expect(result).toMatchObject({ status: 'rejected' });
    expect(fake.current.data.Profile[1]!.ageStatus).toBe('REJECTED');
    expect(fake.current.data.IdentityVerification[1]!.failureReason).toBe(
      'document_already_used',
    );
  });

  it('ignores results from another provider or unknown sessions', async () => {
    const { sessionId } = await start('p1');
    expect(
      await applyVerificationResult('veriff', approved(sessionId)),
    ).toMatchObject({ applied: false });
    expect(
      await applyVerificationResult('mock', approved('nope')),
    ).toMatchObject({ applied: false });
  });

  it('limits attempts to 3 per 30 days', async () => {
    for (let i = 0; i < 3; i++) await start('p1');
    await expect(start('p1')).rejects.toMatchObject({
      status: 429,
      code: 'kyc_attempts',
    });
  });
});
