import type { ErrorCode } from '@/i18n/dictionaries';
import { GoTrueError } from './gotrue';
import { ApiError } from './http';

/** GoTrue error codes we surface, with their HTTP status. Messages live in the i18n dictionaries. */
const STATUSES: Partial<Record<ErrorCode, number>> = {
  invalid_credentials: 401,
  email_not_confirmed: 403,
  user_already_exists: 409,
  email_exists: 409,
  weak_password: 400,
  same_password: 400,
  over_email_send_rate_limit: 429,
  over_request_rate_limit: 429,
  otp_expired: 400,
  mfa_verification_failed: 400,
  mfa_challenge_expired: 400,
  mfa_factor_name_conflict: 409,
  identity_already_exists: 409,
  single_identity_not_deletable: 400,
  manual_linking_disabled: 503,
  insufficient_aal: 403,
  reauthentication_needed: 403,
  session_not_found: 401,
  refresh_token_not_found: 401,
  refresh_token_already_used: 401,
  bad_jwt: 401,
  user_not_found: 404,
  signup_disabled: 503,
};

export function toApiError(err: unknown): unknown {
  if (!(err instanceof GoTrueError)) return err;
  const status = STATUSES[err.code as ErrorCode];
  if (status) return new ApiError(status, err.code as ErrorCode);
  if (err.status === 429) return new ApiError(429, 'rate_limited');
  if (err.status === 401) return new ApiError(401, 'unauthenticated');
  console.error('GoTrue error', err.status, err.code, err.message);
  return new ApiError(502, 'auth_unavailable');
}

/** Wraps a GoTrue call, translating its errors to ApiErrors. */
export async function auth<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    throw toApiError(err);
  }
}
