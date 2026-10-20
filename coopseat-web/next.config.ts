import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(self), microphone=(self), display-capture=(self), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const signalOrigin = (() => {
  const url = process.env['PARTY_SIGNAL_URL'];
  if (!url) return [];
  const { host, protocol } = new URL(url);
  return [
    `${protocol}//${host}`,
    `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}`,
  ];
})();
const isDev = process.env.NODE_ENV !== 'production';
const analyticsHosts = [
  'https://www.googletagmanager.com',
  'https://*.google-analytics.com',
  'https://*.clarity.ms',
  'https://c.bing.com',
];

/**
 * Party rooms render chat from other users, so they get a CSP on top of React's escaping. ICE traffic
 * (STUN/TURN on Cloudflare) isn't governed by CSP; only the signaling WebSocket needs connect-src.
 */
const partyCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ''}${analyticsHosts.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${[...signalOrigin, ...analyticsHosts, ...(isDev ? ['ws:'] : [])].join(' ')}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const partyHeaders = [
  { key: 'Content-Security-Policy', value: partyCsp },
  { key: 'Referrer-Policy', value: 'no-referrer' },
];

/** Installed desktop builds and e-mails sent before the rename still open the Portuguese paths. */
const legacyRoutes: [string, string][] = [
  ['/entrar/2fa', '/login/2fa'],
  ['/entrar', '/login'],
  ['/cadastro', '/signup'],
  ['/esqueci-senha', '/forgot-password'],
  ['/redefinir-senha', '/reset-password'],
  ['/conta', '/account'],
  ['/privacidade', '/privacy'],
  ['/termos', '/terms'],
  ['/verificacao/mock', '/verification/mock'],
  ['/auth/abrir-app', '/auth/open-app'],
  ['/auth/confirmado', '/auth/confirmed'],
  ['/auth/erro', '/auth/error'],
];

const nextConfig: NextConfig = {
  transpilePackages: ['@coopseat/ui'],
  serverExternalPackages: [
    'pg',
    '@prisma/orm-postgres',
    '@prisma/orm-extension-supabase',
  ],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/party/:path*', headers: partyHeaders },
    ];
  },
  async redirects() {
    return legacyRoutes.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
