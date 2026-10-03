import { env } from '../env';
import { mockProvider } from './providers/mock';
import type { IdentityProvider } from './types';

const providers: Record<string, IdentityProvider> = {
  [mockProvider.id]: mockProvider,
};

export function isMockAllowed(): boolean {
  return !env.isProduction || process.env['ALLOW_MOCK_KYC'] === '1';
}

export function getProvider(id: string): IdentityProvider | null {
  if (id === mockProvider.id && !isMockAllowed()) return null;
  return providers[id] ?? null;
}

export function activeProvider(): IdentityProvider {
  const provider = getProvider(env.kycProvider);
  if (!provider) throw new Error(`Provedor de KYC indisponível: ${env.kycProvider}`);
  return provider;
}

export type { IdentityProvider } from './types';
