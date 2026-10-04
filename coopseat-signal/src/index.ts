import { isUuid, verifyInternal } from '@coopseat/ui/party-protocol';
import type { Env } from './env';

export { PartySession } from './session';

/** Desktop (file://) sends `Origin: null`; tokens, not origins, are the real authorization. */
export function originAllowed(origin: string | null, allowed: string): boolean {
  if (origin === null || origin === 'null') return true;
  return allowed
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .includes(origin);
}

const NONCE_TTL_MS = 2 * 60_000;
const seenNonces = new Map<string, number>();

/** Per-isolate replay guard; the 60 s timestamp window bounds what an isolate restart could allow. */
function burnNonce(nonce: string, now = Date.now()): boolean {
  for (const [n, at] of seenNonces) if (now - at > NONCE_TTL_MS) seenNonces.delete(n);
  if (seenNonces.has(nonce)) return false;
  seenNonces.set(nonce, now);
  return true;
}

function stub(env: Env, sid: string) {
  return env.PARTY_SESSION.get(env.PARTY_SESSION.idFromName(sid));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    const ws = url.pathname.match(/^\/sessions\/([^/]+)\/ws$/);
    if (ws) {
      const sid = ws[1]!;
      if (!isUuid(sid)) return new Response('not found', { status: 404 });
      if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('upgrade required', { status: 426 });
      if (!originAllowed(req.headers.get('origin'), env.ALLOWED_ORIGINS)) return new Response('forbidden', { status: 403 });
      return stub(env, sid).fetch('https://session/ws', {
        headers: { upgrade: 'websocket', 'x-session-id': sid },
      });
    }

    const internal = url.pathname.match(/^\/internal\/sessions\/([^/]+)$/);
    if (internal && req.method === 'POST') {
      const sid = internal[1]!;
      if (!isUuid(sid)) return new Response('not found', { status: 404 });
      const body = await req.text();
      if (body.length > 4096) return new Response('too large', { status: 413 });
      const ok = await verifyInternal(env.PARTY_SIGNAL_SECRET, req.headers, body);
      if (!ok || !burnNonce(ok.nonce)) return new Response('unauthorized', { status: 401 });
      return stub(env, sid).fetch('https://session/internal', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-session-id': sid },
        body,
      });
    }

    if (url.pathname === '/health') return new Response('ok');
    return new Response('not found', { status: 404 });
  },
};
