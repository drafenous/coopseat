import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { getDictionary } from '@/i18n/server';
import { TERMS_VERSION } from '@/lib/validation/account';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.terms };
}

export default async function TermsPage() {
  const t = await getDictionary();
  return (
    <LegalPage
      t={t.legal}
      title={t.terms.title}
      subtitle={t.terms.version(TERMS_VERSION)}
      sections={t.terms.sections}
      related={{ href: '/privacy', label: t.common.privacyPolicy }}
    />
  );
}
