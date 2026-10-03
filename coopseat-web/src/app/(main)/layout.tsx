import type { Metadata } from 'next';
import '@coopseat/ui/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'CoopSeat', template: '%s · CoopSeat' },
  description: 'Assista e jogue junto com seus amigos, com sua câmera, seu controle e sua tela.',
  metadataBase: new URL(process.env['APP_URL'] ?? 'https://coopseat.com'),
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
