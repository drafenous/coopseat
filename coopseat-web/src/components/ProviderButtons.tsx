import { ProviderButton } from '@coopseat/ui/design';
import { OAUTH_PROVIDERS } from '@/lib/validation/account';

export function ProviderButtons({
  next = '/account',
  action,
  desktopChallenge,
}: {
  next?: string;
  action: string;
  desktopChallenge?: string;
}) {
  return (
    <div className="grid gap-2">
      {OAUTH_PROVIDERS.map((provider) => (
        <ProviderButton
          key={provider}
          provider={provider}
          action={action}
          href={
            desktopChallenge
              ? `/api/auth/oauth/${provider}?client=desktop&challenge=${encodeURIComponent(desktopChallenge)}`
              : `/api/auth/oauth/${provider}?next=${encodeURIComponent(next)}`
          }
        />
      ))}
    </div>
  );
}
