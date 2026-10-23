import type { Metadata } from 'next';
import { RoomDirectory } from '@coopseat/ui/rooms/directory';
import { getDictionary, getLocale } from '@/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [{ meta }, locale] = await Promise.all([getDictionary(), getLocale()]);
  return pageMetadata({
    locale,
    path: '/rooms',
    title: meta.rooms,
    description: meta.roomsDescription,
    imageAlt: meta.title,
  });
}

export default async function RoomsPage() {
  const locale = await getLocale();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12 sm:py-16">
      <RoomDirectory locale={locale} />
    </div>
  );
}
