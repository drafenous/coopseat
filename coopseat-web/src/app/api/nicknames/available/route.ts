import { NextResponse } from 'next/server';
import { errorMessage } from '@/i18n/dictionaries';
import { dictionaryFor } from '@/i18n/server';
import { nicknameSchema } from '@/lib/validation/account';
import { clientIp, route } from '@/server/http';
import { isNicknameAvailable } from '@/server/profiles';
import { rateLimit } from '@/server/rate-limit';

export const GET = route(async (req) => {
  await rateLimit('nickname', clientIp(req));
  const t = dictionaryFor(req);
  const parsed = nicknameSchema.safeParse(req.nextUrl.searchParams.get('n') ?? '');
  if (!parsed.success) {
    return NextResponse.json({ available: false, reason: errorMessage(t, parsed.error.issues[0]?.message, 'invalid_input') });
  }
  const available = await isNicknameAvailable(parsed.data);
  return NextResponse.json({ available, reason: available ? undefined : errorMessage(t, 'nickname_taken') });
});
