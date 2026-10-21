import type { NextRequest } from 'next/server';
import {
  internalHeaders,
  verifyInternal,
  type InternalCommand,
} from '@coopseat/ui/party-protocol';
import { adminDb } from '@/prisma/db';
import { env } from '../env';
import { ApiError } from '../http';

const TIMEOUT_MS = 3000;

/** Public WebSocket URL handed to clients alongside the room token. */
export function signalSocketUrl(sessionId: string): string | null {
  if (!env.partySignalUrl) return null;
  return `${env.partySignalUrl.replace(/^http/, 'ws')}/sessions/${sessionId}/ws`;
}

/**
 * Best effort: the signal server also learns about changes on the next token refresh, so a failed
 * call degrades to "applies within ~10 minutes" instead of failing the user's request.
 */
export async function signalCommand(
  sessionId: string,
  command: InternalCommand,
): Promise<boolean> {
  if (!env.partySignalUrl) {
    if (env.isProduction)
      console.error(
        'PARTY_SIGNAL_URL missing; signal command dropped',
        command.action,
      );
    return false;
  }
  const body = JSON.stringify(command);
  try {
    const res = await fetch(
      `${env.partySignalUrl}/internal/sessions/${sessionId}`,
      {
        method: 'POST',
        headers: await internalHeaders(env.partySignalSecret, body),
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok)
      console.warn('Signal command failed', {
        sessionId,
        action: command.action,
        status: res.status,
      });
    return res.ok;
  } catch (err) {
    console.warn('Signal command error', {
      sessionId,
      action: command.action,
      err: String(err),
    });
    return false;
  }
}

/**
 * True when the room is holding a kick that no token can pass yet. A missed answer
 * does not block admission: the room still rejects the socket. TURN is the call
 * that must treat `true` as a refusal.
 */
export async function signalKickHeld(
  sessionId: string,
  profileId: string,
): Promise<boolean> {
  if (!env.partySignalUrl) return false;
  const command: InternalCommand = { action: 'removed', profileId };
  const body = JSON.stringify(command);
  try {
    const res = await fetch(
      `${env.partySignalUrl}/internal/sessions/${sessionId}`,
      {
        method: 'POST',
        headers: await internalHeaders(env.partySignalSecret, body),
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { closed?: unknown };
    return data.closed === true;
  } catch {
    return false;
  }
}

/** Verifies an HMAC-signed call from coopseat-signal and burns its nonce (replay protection). */
export async function verifySignalRequest(
  req: NextRequest,
  body: string,
): Promise<void> {
  const ok = await verifyInternal(env.partySignalSecret, req.headers, body);
  if (!ok) throw new ApiError(401, 'party_signal_invalid');
  const db = await adminDb();
  const key = `signal_nonce:${ok.nonce}`;
  const seen = await db.orm.public.RateLimitHit.where({ key }).first();
  if (seen) throw new ApiError(401, 'party_signal_invalid');
  await db.orm.public.RateLimitHit.create({ key });
}
