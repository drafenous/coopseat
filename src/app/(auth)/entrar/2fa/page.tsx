import type { Metadata } from 'next';
import { Card } from '@/components/ui';
import { safeNextPath } from '@/server/http';
import { MfaForm } from './MfaForm';

export const metadata: Metadata = { title: 'Verificação em duas etapas' };

export default async function MfaPage({ searchParams }: PageProps<'/entrar/2fa'>) {
  const params = await searchParams;
  const next = safeNextPath(typeof params['next'] === 'string' ? params['next'] : null);
  return (
    <Card title="Verificação em duas etapas" subtitle="Digite o código de 6 dígitos do seu app autenticador.">
      <MfaForm next={next} />
    </Card>
  );
}
