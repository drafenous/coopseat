import type { Locale } from '../config';
import { en, type Dictionary } from './en';
import { ptBR } from './pt-BR';

export type { Dictionary, ErrorCode } from './en';

export const dictionaries: Record<Locale, Dictionary> = { en, 'pt-BR': ptBR };

/** Resolves an API/validation error code; unknown codes fall back to `fallback`. */
export function errorMessage(dict: Dictionary, code: string | undefined, fallback: keyof Dictionary['errors'] = 'generic'): string {
  const errors: Record<string, string> = dict.errors;
  return (code && Object.hasOwn(errors, code) ? errors[code] : undefined) ?? errors[fallback]!;
}
