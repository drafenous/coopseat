function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export const env = {
  get supabaseUrl() {
    return required('SUPABASE_URL').replace(/\/$/, '');
  },
  get publishableKey() {
    return required('SUPABASE_PUBLISHABLE_KEY');
  },
  get secretKey() {
    return required('SUPABASE_SECRET_KEY');
  },
  get jwksUrl() {
    return process.env['SUPABASE_JWKS_URL'] ?? `${this.supabaseUrl}/auth/v1/.well-known/jwks.json`;
  },
  get appUrl() {
    return (process.env['APP_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');
  },
  get ticketKey() {
    return required('TICKET_ENCRYPTION_KEY');
  },
  get docFingerprintSecret() {
    return required('DOC_FINGERPRINT_SECRET');
  },
  get turnstileSecret() {
    return process.env['TURNSTILE_SECRET_KEY'] ?? '';
  },
  get kycProvider() {
    return process.env['KYC_PROVIDER'] ?? 'mock';
  },
  get turnKeyId() {
    return required('CLOUDFLARE_TURN_KEY_ID');
  },
  get turnApiToken() {
    return required('CLOUDFLARE_TURN_API_TOKEN');
  },
  get resendApiKey() {
    return required('RESEND_API_KEY');
  },
  get emailFrom() {
    return process.env['EMAIL_FROM'] || 'CoopSeat <no-reply@coopseat.com>';
  },
  get gaId() {
    return process.env['NEXT_PUBLIC_GA_ID'] ?? '';
  },
  get gaApiSecret() {
    return process.env['GA_API_SECRET'] ?? '';
  },
  get isProduction() {
    return process.env['NODE_ENV'] === 'production';
  },
};
