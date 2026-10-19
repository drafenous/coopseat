export const OAUTH_PROVIDERS = ['google', 'discord'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  discord: 'Discord',
  email: 'E-mail',
};
