import { getLocale } from '@/i18n/server';
import { PlayClient } from './PlayClient';

export default async function PlayPage() {
  return <PlayClient locale={await getLocale()} />;
}
