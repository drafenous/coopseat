import type { Metadata } from 'next';
import { Card } from '@/components/ui';
import { OpenApp } from './OpenApp';

export const metadata: Metadata = { title: 'Voltando para o app', robots: { index: false } };

const ALLOWED = /^coopseat:\/\/auth\/(callback\?ticket=[A-Za-z0-9_-]{43}|linked|confirmed|verified)$/;

export default async function OpenAppPage({ searchParams }: PageProps<'/auth/abrir-app'>) {
  const params = await searchParams;
  const to = typeof params['to'] === 'string' && ALLOWED.test(params['to']) ? params['to'] : null;
  return (
    <Card title="Voltando para o CoopSeat" subtitle="Se o app não abrir sozinho, use o botão abaixo. Depois pode fechar esta aba.">
      {to ? <OpenApp to={to} /> : <p className="text-sm text-red-300">Link inválido.</p>}
    </Card>
  );
}
