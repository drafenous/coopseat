import { setTelemetryConsent, useTelemetryConsent } from '../../lib/telemetry';
import { bridge, platform } from '../../platform';
import { Button } from '../atoms';
import { Modal, SelectField, ToggleField } from '../molecules';
import {
  LOCALE_NAMES,
  UI_LOCALES,
  setLocale,
  useLocale,
  useT,
  type UiLocale,
} from '../../i18n';

/** App-wide options that don't depend on the signed-in user or the current preset. */
export function PreferencesModal({ onClose }: { onClose(): void }) {
  const T = useT(),
    t = T.preferences;
  const locale = useLocale(),
    telemetry = useTelemetryConsent();
  const p = platform(),
    cookiePreferences = p.kind === 'web' ? p.cookiePreferences : undefined;
  const openCookies = () => {
    onClose();
    cookiePreferences?.();
  };
  return (
    <Modal small labelledBy="preferences-title" closeButton onClose={onClose}>
      <h2 id="preferences-title">{t.title}</h2>
      <p>{t.body}</p>
      <SelectField<UiLocale>
        label={T.common.language}
        value={locale}
        onChange={(l) => setLocale(l)}
        options={UI_LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
      />
      {bridge() && (
        <ToggleField
          label={t.telemetry}
          hint={t.telemetryHint}
          checked={telemetry === 'granted'}
          onChange={(v) => setTelemetryConsent(v ? 'granted' : 'denied')}
        />
      )}
      {cookiePreferences && (
        <div className="flex items-center justify-between gap-3 pt-1.5 pb-3.5 text-[14px] text-[#c9d4de]">
          <span>
            {t.cookies}
            <span className="mt-[3px] block text-[12px] text-[#8494a5]">
              {t.cookiesHint}
            </span>
          </span>
          <Button variant="secondary" inline onClick={openCookies}>
            {t.manage}
          </Button>
        </div>
      )}
      <Button className="mt-4" onClick={onClose}>
        {T.common.close}
      </Button>
    </Modal>
  );
}
