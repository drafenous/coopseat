export const OAUTH_PROVIDERS = ['google'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  email: 'E-mail',
};
