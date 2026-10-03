import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/server/env';
import { gotrue, type AuthTokens } from '@/server/gotrue';
import {
  clearOAuthState,
  hasVerifiedFactor,
  readOAuthState,
  sealMfaToken,
  setMfaCookie,
} from '@/server/oauth-state';
import { ensureProfile } from '@/server/profiles';
import { setSessionCookies } from '@/server/session';
import { createTicket } from '@/server/tickets';

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, env.appUrl), 303);
}

function openApp(deepLink: string) {
  return redirect(`/auth/abrir-app?to=${encodeURIComponent(deepLink)}`);
}

function errorPage(message: string) {
  return redirect(`/auth/erro?mensagem=${encodeURIComponent(message)}`);
}

function avatarOf(tokens: AuthTokens): string | null {
  for (const identity of tokens.user.identities ?? []) {
    const url = identity.identity_data?.avatar_url ?? identity.identity_data?.picture;
    if (typeof url === 'string') return url;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const state = readOAuthState(req);
  const finish = clearOAuthState;

  if (!state) return finish(errorPage('O login expirou. Volte e tente de novo.'));

  const providerError = params.get('error_description') ?? params.get('error');
  if (providerError) {
    const message = /already linked|identity_already_exists/i.test(providerError)
      ? 'Essa conta do provedor já está vinculada a outro usuário do CoopSeat.'
      : 'O provedor recusou o login. Tente de novo.';
    return finish(errorPage(message));
  }

  const code = params.get('code');
  if (!code) return finish(errorPage('Resposta inválida do provedor.'));

  let tokens: AuthTokens;
  try {
    tokens = await gotrue.pkceGrant(code, state.verifier);
  } catch {
    return finish(errorPage('Não foi possível concluir o login. Tente de novo.'));
  }
  await ensureProfile(tokens.user.id, avatarOf(tokens));

  switch (state.mode) {
    case 'desktop': {
      const payload = hasVerifiedFactor(tokens)
        ? { mfaRequired: true, mfaToken: sealMfaToken(tokens) }
        : { tokens };
      const ticket = await createTicket('desktop_login', payload, state.desktopChallenge);
      return finish(openApp(`coopseat://auth/callback?ticket=${ticket}`));
    }
    case 'link-desktop': {
      // The desktop keeps its own session; the one minted by the link flow is discarded.
      await gotrue.logout(tokens.access_token).catch(() => undefined);
      return finish(openApp('coopseat://auth/linked'));
    }
    case 'link-web': {
      const res = redirect('/conta?vinculado=1');
      setSessionCookies(res, tokens);
      return finish(res);
    }
    case 'web': {
      if (hasVerifiedFactor(tokens)) {
        const res = redirect(`/entrar/2fa?next=${encodeURIComponent(state.next ?? '/conta')}`);
        setMfaCookie(res, tokens);
        return finish(res);
      }
      const res = redirect(state.next ?? '/conta');
      setSessionCookies(res, tokens);
      return finish(res);
    }
  }
}
