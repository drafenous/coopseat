/** Site path of a room. The Portuguese pages live under `/pt-BR`; every other locale is unprefixed. */
export function partyPath(nickname: string, locale?: string | null): string {
  const prefix = locale === 'pt-BR' ? '/pt-BR' : '';
  return `${prefix}/party/${encodeURIComponent(nickname)}`;
}

/** Download page for the same locale rule as `partyPath`. */
export function downloadPath(locale?: string | null): string {
  return locale === 'pt-BR' ? '/pt-BR/download' : '/download';
}

/** Public room list for the same locale rule. */
export function roomsPath(locale?: string | null): string {
  return locale === 'pt-BR' ? '/pt-BR/rooms' : '/rooms';
}
