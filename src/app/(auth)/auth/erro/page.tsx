import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card } from '@/components/ui';

export const metadata: Metadata = { title: 'Não foi possível continuar' };

export default async function AuthErrorPage({ searchParams }: PageProps<'/auth/erro'>) {
  const params = await searchParams;
  const raw = typeof params['mensagem'] === 'string' ? params['mensagem'] : '';
  const message = raw.length > 0 && raw.length <= 200 ? raw : 'Algo deu errado. Tente novamente.';
  return (
    <Card title="Não foi possível continuar">
      <Alert>{message}</Alert>
      <Link href="/entrar" className="block text-center text-sm text-accent">Voltar para o login</Link>
    </Card>
  );
}
