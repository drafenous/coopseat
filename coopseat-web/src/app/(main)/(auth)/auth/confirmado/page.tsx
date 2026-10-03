import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card, buttonClass } from '@/components/ui';

export const metadata: Metadata = { title: 'E-mail confirmado' };

export default async function ConfirmedPage({ searchParams }: PageProps<'/auth/confirmado'>) {
  const params = await searchParams;
  if (params['erro']) {
    return (
      <Card title="Link inválido">
        <Alert>O link expirou ou já foi usado. Entre na sua conta para pedir um novo.</Alert>
        <Link href="/entrar" className="block text-center text-sm text-accent">Ir para o login</Link>
      </Card>
    );
  }
  const emailChange = params['tipo'] === 'email_change';
  return (
    <Card title={emailChange ? 'E-mail atualizado' : 'E-mail confirmado!'}>
      <Alert tone="success">
        {emailChange
          ? 'Se você confirmou nos dois endereços, a troca foi concluída.'
          : 'Sua conta está ativa. Você já pode usar o CoopSeat.'}
      </Alert>
      <a href="coopseat://auth/confirmed" className={buttonClass()}>
        Abrir o app CoopSeat
      </a>
      <Link href="/conta" className="block text-center text-sm text-muted hover:text-foreground">
        Continuar no navegador
      </Link>
    </Card>
  );
}
