import { NextResponse } from 'next/server';
import { nicknameSchema } from '@/lib/validation/account';
import { clientIp, route } from '@/server/http';
import { isNicknameAvailable } from '@/server/profiles';
import { rateLimit } from '@/server/rate-limit';

export const GET = route(async (req) => {
  await rateLimit('nickname', clientIp(req));
  const parsed = nicknameSchema.safeParse(req.nextUrl.searchParams.get('n') ?? '');
  if (!parsed.success) {
    return NextResponse.json({ available: false, reason: parsed.error.issues[0]?.message });
  }
  const available = await isNicknameAvailable(parsed.data);
  return NextResponse.json({ available, reason: available ? undefined : 'Esse apelido já está em uso.' });
});
