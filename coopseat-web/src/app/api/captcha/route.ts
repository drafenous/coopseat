import { NextResponse } from 'next/server';
import { route } from '@/server/http';
import { env } from '@/server/env';

/** Public Turnstile site key, so the player (including the desktop app) can render the widget. */
export const GET = route(async () => {
  return NextResponse.json(
    { siteKey: env.turnstileSiteKey },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
});
