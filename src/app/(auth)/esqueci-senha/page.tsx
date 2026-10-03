import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { ForgotForm } from './ForgotForm';

export const metadata: Metadata = { title: 'Esqueci minha senha' };

export default function ForgotPage() {
  return (
    <Card
      title="Esqueci minha senha"
      subtitle={<>Lembrou? <Link href="/entrar" className="text-accent">Voltar para o login</Link></>}
    >
      <ForgotForm />
    </Card>
  );
}
