import { OAUTH_PROVIDERS, PROVIDER_LABELS } from '@/lib/validation/account';

export function ProviderButtons({ next = '/conta', verb = 'Entrar' }: { next?: string; verb?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {OAUTH_PROVIDERS.map((provider) => (
        <a
          key={provider}
          href={`/api/auth/oauth/${provider}?next=${encodeURIComponent(next)}`}
          className="rounded-lg bg-white/5 px-3 py-2 text-center text-sm font-medium ring-1 ring-white/10 transition hover:bg-white/10"
        >
          {verb} com {PROVIDER_LABELS[provider]}
        </a>
      ))}
    </div>
  );
}
