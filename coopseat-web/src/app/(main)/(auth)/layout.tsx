import { Brand } from '@coopseat/ui/design';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { localeHref } from '@/i18n/config';
import { getLocale } from '@/i18n/server';

export default async function AuthLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <Brand href={localeHref(locale, '/')} version={null} />
      {children}
      <LanguageSwitcher />
    </main>
  );
}
