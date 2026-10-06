import { NextResponse } from 'next/server';
import { ApiError, route } from '@/server/http';
import { isVariant, latestDownloadUrl } from '@/server/releases';

type Ctx = { params: Promise<{ variant: string }> };

/** Public download of the latest Windows installer or portable build, served from the private GitHub repo's releases. */
export const GET = route<Ctx>(async (_req, ctx) => {
  const { variant } = await ctx.params;
  if (!isVariant(variant)) throw new ApiError(404, 'download_unavailable');
  return NextResponse.redirect(await latestDownloadUrl(variant), {
    status: 302,
    headers: { 'Cache-Control': 'no-store' },
  });
});
