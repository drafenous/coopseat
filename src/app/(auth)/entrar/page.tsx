import type { Metadata } from 'next';
import Link from 'next/link';
import { ProviderButtons } from '@/components/ProviderButtons';
import { Card, Divider } from '@/components/ui';
import { safeNextPath } from '@/server/http';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({ searchParams }: PageProps<'/entrar'>) {
  const params = await searchParams;
  const next = safeNextPath(typeof params['next'] === 'string' ? params['next'] : null);
  return (
    <Card title="Entrar" subtitle={<>Não tem conta? <Link href="/cadastro" className="text-accent">Cadastre-se</Link></>}>
      <ProviderButtons next={next} />
      <Divider label="ou com e-mail" />
      <LoginForm next={next} />
      <p className="text-center text-sm">
        <Link href="/esqueci-senha" className="text-muted hover:text-foreground">Esqueci minha senha</Link>
      </p>
    </Card>
  );
}
