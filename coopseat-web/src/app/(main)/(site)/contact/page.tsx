import type { Metadata } from 'next';
import { getDictionary, getLocale } from '@/i18n/server';
import { pageMetadata } from '@/lib/seo';
import { ContactForm } from './ContactForm';

export async function generateMetadata(): Promise<Metadata> {
  const [{ meta }, locale] = await Promise.all([getDictionary(), getLocale()]);
  return pageMetadata({
    locale,
    path: '/contact',
    title: meta.contact,
    description: meta.contactDescription,
    imageAlt: meta.title,
  });
}

export default async function ContactPage() {
  const t = await getDictionary();
  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16 sm:py-20">
      <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
        {t.contact.kicker}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-strong">
        {t.contact.title}
      </h1>
      <p className="mt-4 text-muted">{t.contact.subtitle}</p>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-7">
        <ContactForm />
      </div>
    </div>
  );
}
