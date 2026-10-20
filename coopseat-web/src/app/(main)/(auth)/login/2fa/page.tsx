import type { Metadata } from 'next';
import { Card } from '@/components/ui';
import { getDictionary } from '@/i18n/server';
import { safeNextPath } from '@/server/http';
import { MfaForm } from './MfaForm';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.mfa, robots: { index: false } };
}

export default async function MfaPage({
  searchParams,
}: PageProps<'/login/2fa'>) {
  const [params, t] = await Promise.all([searchParams, getDictionary()]);
  const next = safeNextPath(
    typeof params['next'] === 'string' ? params['next'] : null,
  );
  return (
    <Card title={t.mfa.title}>
      <MfaForm next={next} />
    </Card>
  );
}
