import { getT } from '../i18n';

export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
export const niceError = (e: unknown) => {
  const name = e instanceof Error ? e.name : '';
  return getT().mediaErrors[name] || errorText(e);
};
