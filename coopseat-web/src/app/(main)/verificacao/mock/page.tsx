import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Button, Card, Field } from '@/components/ui';
import { isMockAllowed } from '@/server/identity';
import { applyVerificationResult } from '@/server/identity/service';
import type { VerificationResult } from '@/server/identity/types';

export const metadata: Metadata = { title: 'Verificação (simulada)', robots: { index: false } };

const OUTCOMES = {
  adult: { label: 'Aprovar (maior de 18)', status: 'approved', isAdult: true },
  minor: { label: 'Aprovar documento de menor de 18', status: 'approved', isAdult: false },
  reject: { label: 'Recusar (documento ilegível)', status: 'rejected', isAdult: null },
  review: { label: 'Enviar para análise manual', status: 'review', isAdult: null },
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

  const back = String(formData.get('return') ?? '/conta');
  redirect(back.startsWith(process.env['APP_URL'] ?? 'http://localhost:3000') || back.startsWith('/') ? back : '/conta');
}

export default async function MockVerificationPage({ searchParams }: PageProps<'/verificacao/mock'>) {
  const params = await searchParams;
  if (!isMockAllowed()) notFound();
  const session = typeof params['session'] === 'string' ? params['session'] : '';
  const back = typeof params['return'] === 'string' ? params['return'] : '/conta';

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card title="Verificação simulada" subtitle="Provedor de KYC de desenvolvimento. Escolha o resultado.">
        <form action={complete} className="flex flex-col gap-3">
          <input type="hidden" name="session" value={session} />
          <input type="hidden" name="return" value={back} />
          <Field label="Número do documento (para testar duplicidade)" name="document" defaultValue="12345678909" />
          {Object.entries(OUTCOMES).map(([key, outcome]) => (
            <Button key={key} type="submit" variant="secondary" name="outcome" value={key}>
              {outcome.label}
            </Button>
          ))}
        </form>
      </Card>
    </main>
  );
}
