export type Env = {
  PARTY_SESSION: DurableObjectNamespace;
  /** Site origins allowed to open sockets, comma separated (the desktop app sends `null`). */
  ALLOWED_ORIGINS: string;
  /** coopseat-web base URL, for event callbacks. */
  APP_URL: string;
  PARTY_TOKEN_PUBLIC_KEY: string;
  PARTY_SIGNAL_SECRET: string;
};
