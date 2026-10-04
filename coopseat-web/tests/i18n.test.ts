import { describe, expect, it } from 'vitest';
import { localePath, matchLocale, resolveLocale, splitLocalePath } from '@/i18n/config';
import { en } from '@/i18n/dictionaries/en';
import { ptBR } from '@/i18n/dictionaries/pt-BR';
import { en as uiEn } from '../../packages/ui/src/i18n/en';
import { ptBR as uiPtBR } from '../../packages/ui/src/i18n/pt-BR';

/** Flattens a dictionary into `path:kind` entries; arrays keep their length so sections stay aligned. */
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return [`${path}:array(${value.length})`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  if (value && typeof value === 'object' && !('$$typeof' in value)) {
    return Object.entries(value).flatMap(([key, v]) => shape(v, path ? `${path}.${key}` : key));
  }
  return [`${path}:${typeof value === 'function' ? 'function' : 'value'}`];
}

describe('matchLocale', () => {
  it('defaults to English', () => {
    expect(matchLocale(null)).toBe('en');
    expect(matchLocale('')).toBe('en');
    expect(matchLocale('fr-FR,de;q=0.8')).toBe('en');
  });

  it('maps any Portuguese variant to pt-BR', () => {
    expect(matchLocale('pt-BR,pt;q=0.9,en;q=0.8')).toBe('pt-BR');
    expect(matchLocale('pt-PT')).toBe('pt-BR');
    expect(matchLocale('fr,pt;q=0.5')).toBe('pt-BR');
  });

  it('honors q-values over header order', () => {
    expect(matchLocale('en;q=0.4,pt-BR;q=0.9')).toBe('pt-BR');
    expect(matchLocale('pt;q=0,en-US')).toBe('en');
  });

  it('prefers a valid cookie over the header', () => {
    expect(resolveLocale('pt-BR', 'en-US')).toBe('pt-BR');
    expect(resolveLocale('xx', 'pt-BR')).toBe('pt-BR');
    expect(resolveLocale(undefined, undefined)).toBe('en');
  });
});

describe('locale paths', () => {
  it('keeps English unprefixed and prefixes Portuguese', () => {
    expect(localePath('en', '/')).toBe('/');
    expect(localePath('en', '/download')).toBe('/download');
    expect(localePath('pt-BR', '/')).toBe('/pt-BR');
    expect(localePath('pt-BR', '/download')).toBe('/pt-BR/download');
  });

  it('splits only an exact prefix segment', () => {
    expect(splitLocalePath('/pt-BR')).toEqual({ locale: 'pt-BR', path: '/' });
    expect(splitLocalePath('/pt-BR/')).toEqual({ locale: 'pt-BR', path: '/' });
    expect(splitLocalePath('/pt-BR/download/installer')).toEqual({ locale: 'pt-BR', path: '/download/installer' });
    expect(splitLocalePath('/pt-BRX')).toBeNull();
    expect(splitLocalePath('/download')).toBeNull();
    expect(splitLocalePath('/')).toBeNull();
  });
});

describe('dictionaries', () => {
  it('web pt-BR has exactly the keys of en', () => {
    expect(shape(ptBR)).toEqual(shape(en));
  });

  it('ui pt-BR has exactly the keys of en', () => {
    expect(shape(uiPtBR)).toEqual(shape(uiEn));
  });
});
