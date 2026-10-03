import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { getDictionary } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.privacy };
}

export default async function PrivacyPage() {
  const t = await getDictionary();
  return (
    <LegalPage
      t={t.legal}
      title={t.privacy.title}
      subtitle={t.privacy.compliance}
      sections={t.privacy.sections}
      related={{ href: '/terms', label: t.common.termsOfUse }}
    />
  );
}
