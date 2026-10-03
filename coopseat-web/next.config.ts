import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
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
  serverExternalPackages: ['pg', '@prisma/orm-postgres', '@prisma/orm-extension-supabase'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return legacyRoutes.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default nextConfig;
