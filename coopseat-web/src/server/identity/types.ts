/**
 * Contract every KYC vendor adapter implements (Veriff, Unico, idwall, ...). The app only
 * keeps the outcome: adult or not, when, and an HMAC fingerprint of the document to stop
 * one document from verifying several accounts. No images or document data are stored.
 */
export interface IdentityProvider {
  readonly id: string;
  createSession(input: CreateSessionInput): Promise<{ sessionId: string; url: string }>;
  /** Must authenticate the request (signature/HMAC) and throw when it is not genuine. */
  parseWebhook(rawBody: string, headers: Headers): Promise<VerificationResult>;
}

export type CreateSessionInput = {
  profileId: string;
  /** Where the vendor sends the user when finished. */
  returnUrl: string;
  /** Webhook endpoint for this provider. */
  callbackUrl: string;
};

export type VerificationResult = {
  sessionId: string;
  status: 'approved' | 'rejected' | 'review';
  /** Computed by the vendor from the document's birth date. */
  isAdult: boolean | null;
  document: { country: string; number: string } | null;
  failureReason?: string;
};

export class WebhookAuthError extends Error {}
