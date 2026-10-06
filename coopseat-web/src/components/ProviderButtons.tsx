import { ProviderButton } from '@coopseat/ui/design';
import { OAUTH_PROVIDERS } from '@/lib/validation/account';

export function ProviderButtons({
  next = '/account',
  action,
}: {
  next?: string;
  action: string;
}) {
  return (
    <div className="grid gap-2">
      {OAUTH_PROVIDERS.map((provider) => (
        <ProviderButton
          key={provider}
          provider={provider}
          action={action}
          href={`/api/auth/oauth/${provider}?next=${encodeURIComponent(next)}`}
        />
      ))}
    </div>
  );
}
