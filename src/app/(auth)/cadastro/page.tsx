import type { Metadata } from 'next';
import Link from 'next/link';
import { ProviderButtons } from '@/components/ProviderButtons';
import { Card, Divider } from '@/components/ui';
import { SignupForm } from './SignupForm';

export const metadata: Metadata = { title: 'Criar conta' };

export default function SignupPage() {
  return (
    <Card
      title="Criar conta"
      subtitle={<>Já tem conta? <Link href="/entrar" className="text-accent">Entrar</Link></>}
    >
      <ProviderButtons verb="Continuar" next="/conta?boasvindas=1" />
      <Divider label="ou com e-mail" />
      <SignupForm />
    </Card>
  );
}
