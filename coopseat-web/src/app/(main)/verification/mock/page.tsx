import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Button, Card, Field } from '@/components/ui';
import { getDictionary } from '@/i18n/server';
import { isMockAllowed } from '@/server/identity';
import { applyVerificationResult } from '@/server/identity/service';
import type { VerificationResult } from '@/server/identity/types';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.mockVerification, robots: { index: false } };
}

const OUTCOMES = {
  adult: { status: 'approved', isAdult: true },
  minor: { status: 'approved', isAdult: false },
  reject: { status: 'rejected', isAdult: null },
  review: { status: 'review', isAdult: null },
} as const;

async function complete(formData: FormData) {
  'use server';
  if (!isMockAllowed()) notFound();
  const sessionId = String(formData.get('session') ?? '');
  const outcome = OUTCOMES[String(formData.get('outcome')) as keyof typeof OUTCOMES];
  const document = String(formData.get('document') ?? '').trim() || '00000000000';
  if (!sessionId || !outcome) notFound();

  const result: VerificationResult = {
    sessionId,
    status: outcome.status,
    isAdult: outcome.isAdult,
    document: outcome.status === 'approved' ? { country: 'BR', number: document } : null,
    failureReason: outcome.status === 'rejected' ? 'document_unreadable' : undefined,
  };
  await applyVerificationResult('mock', result);

  const back = String(formData.get('return') ?? '/account');
  redirect(back.startsWith(process.env['APP_URL'] ?? 'http://localhost:3000') || back.startsWith('/') ? back : '/account');
}

export default async function MockVerificationPage({ searchParams }: PageProps<'/verification/mock'>) {
  const [params, t] = await Promise.all([searchParams, getDictionary()]);
  if (!isMockAllowed()) notFound();
  const session = typeof params['session'] === 'string' ? params['session'] : '';
  const back = typeof params['return'] === 'string' ? params['return'] : '/account';

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card title={t.mock.title} subtitle={t.mock.subtitle}>
        <form action={complete} className="flex flex-col gap-3">
          <input type="hidden" name="session" value={session} />
          <input type="hidden" name="return" value={back} />
          <Field label={t.mock.document} name="document" defaultValue="12345678909" />
          {(Object.keys(OUTCOMES) as (keyof typeof OUTCOMES)[]).map((key) => (
            <Button key={key} type="submit" variant="secondary" name="outcome" value={key}>
              {t.mock.outcomes[key]}
            </Button>
          ))}
        </form>
      </Card>
    </main>
  );
}
