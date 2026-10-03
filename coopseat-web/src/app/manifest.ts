import type { MetadataRoute } from 'next';
import { getDictionary } from '@/i18n/server';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getDictionary();
  return {
    name: 'CoopSeat',
    short_name: 'CoopSeat',
    description: t.meta.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1016',
    theme_color: '#0b1016',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
