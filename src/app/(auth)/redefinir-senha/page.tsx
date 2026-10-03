import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card } from '@/components/ui';
import { getPageSession } from '@/server/page-session';
import { ResetForm } from './ResetForm';

export const metadata: Metadata = { title: 'Redefinir senha' };

export default async function ResetPage() {
  const session = await getPageSession();
  return (
    <Card title="Criar nova senha">
      {session ? (
        <ResetForm />
      ) : (
        <Alert>
          O link expirou ou já foi usado. <Link href="/esqueci-senha" className="underline">Peça um novo</Link>.
        </Alert>
      )}
    </Card>
  );
}
