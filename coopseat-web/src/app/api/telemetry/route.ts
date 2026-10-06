import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/server/env';
import { clientIp, readJson, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';

const bodySchema = z.object({
  clientId: z.uuid(),
  sessionId: z.number().int().positive(),
  version: z.string().max(32),
  event: z.enum(['app_open', 'capture_start', 'rtc_connected']),
  backend: z.enum(['native', 'compat']).optional(),
  candidateType: z.enum(['host', 'srflx', 'prflx', 'relay']).optional(),
});

/**
 * Opt-in usage events from the desktop app, forwarded to GA4 through the Measurement
 * Protocol so the API secret never ships in the installer and Google never sees the user's IP.
 */
export const POST = route(async (req) => {
  if (!env.gaId || !env.gaApiSecret)
    return new NextResponse(null, { status: 204 });
  await rateLimit('telemetry', clientIp(req));
  const { clientId, sessionId, version, event, backend, candidateType } =
    await readJson(req, bodySchema);

  const url = new URL('https://www.google-analytics.com/mp/collect');
  url.searchParams.set('measurement_id', env.gaId);
  url.searchParams.set('api_secret', env.gaApiSecret);
  const params = {
    session_id: sessionId,
    engagement_time_msec: 1,
    platform: 'desktop',
    app_version: version,
    ...(backend && { backend }),
    ...(candidateType && { candidate_type: candidateType }),
  };
  await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      client_id: clientId,
      events: [{ name: event, params }],
    }),
  }).catch((err: unknown) => console.error('GA telemetry failed', err));
  return new NextResponse(null, { status: 204 });
});
