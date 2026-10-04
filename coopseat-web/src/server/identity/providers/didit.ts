import { hmacHex, safeEqual } from '@/server/crypto';
import { env } from '@/server/env';
import { ApiError } from '@/server/http';
import { WebhookAuthError, type IdentityProvider, type VerificationResult } from '../types';

const API_URL = 'https://verification.didit.me/v3';
const MAX_CLOCK_SKEW_SECONDS = 300;
const ADULT_AGE = 18;

/**
 * Didit signs X-Signature-V2 over the body re-serialised with recursively sorted keys, compact
 * separators and unescaped Unicode. Built as a string because JS objects reorder integer-like keys.
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function signDiditPayload(body: unknown, secret = env.diditWebhookSecret): string {
  return hmacHex(secret, canonicalJson(body));
}

/** Final session statuses. "Abandoned" and "Expired" end the attempt so the profile does not stay PENDING. */
const STATUS: Record<string, VerificationResult['status']> = {
  Approved: 'approved',
  Declined: 'rejected',
  'In Review': 'review',
  Abandoned: 'rejected',
  Expired: 'rejected',
};

type IdVerification = {
  age?: number | null;
  date_of_birth?: string | null;
  document_number?: string | null;
  issuing_state?: string | null;
};

/** Didit's `age` field, falling back to the YYYY-MM-DD birth date when it is absent. */
export function ageOf(id: IdVerification | undefined, now = new Date()): number | null {
  if (typeof id?.age === 'number') return id.age;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(id?.date_of_birth ?? '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const birthdayPassed = now.getUTCMonth() + 1 > month || (now.getUTCMonth() + 1 === month && now.getUTCDate() >= day);
  return now.getUTCFullYear() - year - (birthdayPassed ? 0 : 1);
}
type DiditWebhook = {
  webhook_type?: string;
  session_kind?: string;
  session_id?: string;
  status?: string;
  decision?: { id_verifications?: IdVerification[] | null } | null;
};

/** Didit hosted flow (didit.me). Needs a workflow with ID verification; liveness is recommended. */
export const diditProvider: IdentityProvider = {
  id: 'didit',

  async createSession({ profileId, returnUrl }) {
    const res = await fetch(`${API_URL}/session/`, {
      method: 'POST',
      headers: { 'x-api-key': env.diditApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: env.diditWorkflowId, vendor_data: profileId, callback: returnUrl }),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('Didit create session error', res.status);
      throw new ApiError(502, 'kyc_unavailable');
    }
    const { session_id, url } = (await res.json()) as { session_id: string; url: string };
    return { sessionId: session_id, url };
  },

  async parseWebhook(rawBody, headers) {
    const timestamp = Number(headers.get('x-timestamp'));
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > MAX_CLOCK_SKEW_SECONDS) {
      throw new WebhookAuthError('stale or missing timestamp');
    }
    const body = JSON.parse(rawBody) as DiditWebhook;
    if (!safeEqual(headers.get('x-signature-v2') ?? '', signDiditPayload(body))) {
      throw new WebhookAuthError('bad signature');
    }

    if (body.webhook_type !== 'status.updated' || body.session_kind === 'business' || !body.session_id) return null;
    const status = STATUS[body.status ?? ''];
    if (!status) return null;

    const id = body.decision?.id_verifications?.[0];
    const age = ageOf(id);
    return {
      sessionId: body.session_id,
      status,
      isAdult: age === null ? null : age >= ADULT_AGE,
      document:
        id?.document_number && id.issuing_state ? { country: id.issuing_state, number: id.document_number } : null,
      failureReason: status === 'rejected' ? body.status!.toLowerCase() : undefined,
    };
  },
};
