import type { Metadata } from 'next';
import '@coopseat/ui/base.css';

export const metadata: Metadata = {
  title: 'Jogar · CoopSeat',
  description: 'Jogue o console numa aba do navegador pela placa de captura USB.',
  metadataBase: new URL(process.env['APP_URL'] ?? 'https://coopseat.com'),
};

/** Separate root layout: the app's global styles must not mix with the site's Tailwind. */
export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
