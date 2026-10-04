import { NextResponse, type NextRequest } from 'next/server';
import { getProvider } from '@/server/identity';
import { applyVerificationResult } from '@/server/identity/service';
import { WebhookAuthError } from '@/server/identity/types';

type Ctx = { params: Promise<{ provider: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const provider = getProvider((await ctx.params).provider);
  if (!provider) return NextResponse.json({ error: 'unknown_provider' }, { status: 404 });

  const raw = await req.text();
  let result;
  try {
    result = await provider.parseWebhook(raw, req.headers);
  } catch (err) {
    if (err instanceof WebhookAuthError) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  if (!result) return NextResponse.json({ applied: false, reason: 'ignored' });

  const outcome = await applyVerificationResult(provider.id, result);
  return NextResponse.json(outcome);
}
