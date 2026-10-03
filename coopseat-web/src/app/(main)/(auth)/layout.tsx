import { Brand } from '@coopseat/ui/design';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <Brand href="/" version={null} />
      {children}
      <LanguageSwitcher />
    </main>
  );
}
