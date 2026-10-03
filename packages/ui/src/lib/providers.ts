export const OAUTH_PROVIDERS=['google','discord','x','facebook'] as const;
export type OAuthProvider=typeof OAUTH_PROVIDERS[number];
export const PROVIDER_LABELS:Record<string,string>={google:'Google',discord:'Discord',x:'X',twitter:'X',facebook:'Facebook',email:'E-mail'};
