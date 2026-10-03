import type { Metadata } from 'next';
import { Card } from '@/components/ui';
import { getDictionary } from '@/i18n/server';
import { OpenApp } from './OpenApp';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.openApp, robots: { index: false } };
}

const ALLOWED = /^coopseat:\/\/auth\/(callback\?ticket=[A-Za-z0-9_-]{43}|linked|confirmed|verified)$/;

export default async function OpenAppPage({ searchParams }: PageProps<'/auth/open-app'>) {
  const [params, t] = await Promise.all([searchParams, getDictionary()]);
  const to = typeof params['to'] === 'string' && ALLOWED.test(params['to']) ? params['to'] : null;
  return (
    <Card title={t.openApp.title} subtitle={t.openApp.subtitle}>
      {to ? <OpenApp to={to} /> : <p className="text-sm text-red-300">{t.openApp.invalid}</p>}
    </Card>
  );
}
