import { NextResponse } from 'next/server';
import { isUuid, type SignalEvent } from '@coopseat/ui/party-protocol';
import { adminDb } from '@/prisma/db';
import { ApiError, route } from '@/server/http';
import { endSession, logModeration, markRemoved } from '@/server/party/access';
import { verifySignalRequest } from '@/server/party/signal';

const END_REASONS = new Set(['owner_ended', 'owner_timeout', 'max_duration', 'sanction', 'operator']);

function parse(body: string): SignalEvent {
  let event: Partial<SignalEvent> & Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    throw new ApiError(400, 'invalid_json');
  }
  if (!isUuid(event.sessionId)) throw new ApiError(400, 'invalid_input');
  if (event.type === 'ended' && END_REASONS.has(String(event.reason))) return event as SignalEvent;
  if (!isUuid(event.profileId)) throw new ApiError(400, 'invalid_input');
  if (event.type === 'joined' || event.type === 'left') return event as SignalEvent;
  if ((event.type === 'kicked' || event.type === 'stream_killed') && isUuid(event.by)) return event as SignalEvent;
  throw new ApiError(400, 'invalid_input');
}

/** Called by coopseat-signal only (HMAC + timestamp + single-use nonce). */
export const POST = route(async (req) => {
  const body = await req.text();
  if (body.length > 4096) throw new ApiError(413, 'invalid_input');
  await verifySignalRequest(req, body);
  const event = parse(body);

  const db = await adminDb();
  const session = await db.orm.public.PartySession.where({ id: event.sessionId }).first();
  if (!session) throw new ApiError(404, 'party_no_session');
  const participants = db.orm.public.PartySessionParticipant;

  switch (event.type) {
    case 'joined':
      await participants.where({ sessionId: session.id, profileId: event.profileId })
        .where((p) => p.removal.isNull())
        .updateAll({ leftAt: null });
      break;
    case 'left':
      await participants.where({ sessionId: session.id, profileId: event.profileId })
        .where((p) => p.leftAt.isNull())
        .updateAll({ leftAt: new Date().toISOString() });
      break;
    case 'kicked':
      await markRemoved(session.id, event.profileId, 'kick', event.by);
      await logModeration({ roomId: session.roomId, sessionId: session.id, actorId: event.by, targetId: event.profileId, action: 'kick' });
      break;
    case 'stream_killed':
      await logModeration({ roomId: session.roomId, sessionId: session.id, actorId: event.by, targetId: event.profileId, action: 'stream_stop' });
      break;
    case 'ended':
      await endSession(session.id, event.reason, false);
      break;
  }
  return NextResponse.json({ ok: true });
});
