import { GoTrueError } from './gotrue';
import { ApiError } from './http';

const MESSAGES: Record<string, [number, string]> = {
  invalid_credentials: [401, 'E-mail ou senha incorretos.'],
  email_not_confirmed: [403, 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'],
  user_already_exists: [409, 'Esse e-mail já está em uso.'],
  email_exists: [409, 'Esse e-mail já está em uso.'],
  weak_password: [400, 'Senha fraca ou já vazada em outro serviço. Escolha outra.'],
  same_password: [400, 'A nova senha precisa ser diferente da atual.'],
  over_email_send_rate_limit: [429, 'Muitos e-mails enviados. Aguarde alguns minutos.'],
  over_request_rate_limit: [429, 'Muitas tentativas. Aguarde alguns minutos.'],
  otp_expired: [400, 'O link expirou ou já foi usado. Peça um novo.'],
  mfa_verification_failed: [400, 'Código inválido. Confira o app autenticador e tente de novo.'],
  mfa_challenge_expired: [400, 'O código expirou. Tente de novo.'],
  mfa_factor_name_conflict: [409, 'Já existe um autenticador com esse nome.'],
  identity_already_exists: [409, 'Essa conta do provedor já está vinculada a outro usuário.'],
  single_identity_not_deletable: [400, 'Você precisa manter pelo menos uma forma de login.'],
  manual_linking_disabled: [503, 'Vinculação de contas indisponível no momento.'],
  insufficient_aal: [403, 'Confirme a autenticação em duas etapas para continuar.'],
  reauthentication_needed: [403, 'Entre novamente para alterar a senha.'],
  session_not_found: [401, 'Sua sessão expirou. Entre novamente.'],
  refresh_token_not_found: [401, 'Sua sessão expirou. Entre novamente.'],
  refresh_token_already_used: [401, 'Sua sessão expirou. Entre novamente.'],
  bad_jwt: [401, 'Sua sessão expirou. Entre novamente.'],
  user_not_found: [404, 'Conta não encontrada.'],
  signup_disabled: [503, 'Cadastros temporariamente desativados.'],
};

export function toApiError(err: unknown): unknown {
  if (!(err instanceof GoTrueError)) return err;
  const known = MESSAGES[err.code];
  if (known) return new ApiError(known[0], err.code, known[1]);
  if (err.status === 429) return new ApiError(429, 'rate_limited', 'Muitas tentativas. Aguarde alguns minutos.');
  if (err.status === 401) return new ApiError(401, 'unauthenticated', 'Sua sessão expirou. Entre novamente.');
  console.error('GoTrue error', err.status, err.code, err.message);
  return new ApiError(502, 'auth_unavailable', 'Não foi possível concluir agora. Tente novamente.');
}

/** Wraps a GoTrue call, translating its errors to PT-BR ApiErrors. */
export async function auth<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    throw toApiError(err);
  }
}
