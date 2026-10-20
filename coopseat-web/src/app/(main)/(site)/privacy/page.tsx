import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [{ meta }, locale] = await Promise.all([getDictionary(), getLocale()]);
  return pageMetadata({
    locale,
    path: '/privacy',
    title: meta.privacy,
    description: meta.privacyDescription,
    imageAlt: meta.title,
  });
}

export default async function PrivacyPage() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  return (
    <LegalPage
      t={t.legal}
      title={t.privacy.title}
      subtitle={t.privacy.compliance}
      sections={t.privacy.sections}
      related={{
        href: localeHref(locale, '/terms'),
        label: t.common.termsOfUse,
      }}
    />
  );
}
