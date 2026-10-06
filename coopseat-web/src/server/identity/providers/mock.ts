import { hmacHex, randomToken, safeEqual } from '@/server/crypto';
import { env } from '@/server/env';
import {
  WebhookAuthError,
  type IdentityProvider,
  type VerificationResult,
} from '../types';

function secret(): string {
  return process.env['MOCK_KYC_SECRET'] ?? 'dev-mock-kyc-secret';
}

export function signMockPayload(body: string): string {
  return hmacHex(secret(), body);
}

/** Development provider: /verification/mock lets the tester pick the outcome. */
export const mockProvider: IdentityProvider = {
  id: 'mock',

  async createSession({ returnUrl }) {
    const sessionId = `mock_${randomToken(16)}`;
    const url = new URL('/verification/mock', env.appUrl);
    url.searchParams.set('session', sessionId);
    url.searchParams.set('return', returnUrl);
    return { sessionId, url: url.toString() };
  },

  async parseWebhook(rawBody, headers) {
    const signature = headers.get('x-mock-signature') ?? '';
    if (!safeEqual(signature, signMockPayload(rawBody)))
      throw new WebhookAuthError('bad signature');
    return JSON.parse(rawBody) as VerificationResult;
  },
};
