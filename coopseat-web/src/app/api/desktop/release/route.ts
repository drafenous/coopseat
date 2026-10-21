import { NextResponse } from 'next/server';
import { route } from '@/server/http';
import { latestRelease } from '@/server/releases';

/** Latest published desktop version. The app compares it with its own and opens /download. */
export const GET = route(async () => {
  const { version } = await latestRelease();
  return NextResponse.json(
    { version },
    { headers: { 'Cache-Control': 'no-store' } },
  );
});
