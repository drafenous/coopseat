import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export default function SiteLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
