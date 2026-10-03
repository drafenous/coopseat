import { ProviderButton } from '@coopseat/ui/design';
import { OAUTH_PROVIDERS } from '@/lib/validation/account';

export function ProviderButtons({ next = '/conta', verb = 'Entrar' }: { next?: string; verb?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {OAUTH_PROVIDERS.map((provider) => (
        <ProviderButton
          key={provider}
          provider={provider}
          action={`${verb} com`}
          compact
          href={`/api/auth/oauth/${provider}?next=${encodeURIComponent(next)}`}
        />
      ))}
    </div>
  );
}
