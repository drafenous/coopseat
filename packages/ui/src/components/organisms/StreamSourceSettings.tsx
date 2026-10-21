import { RefreshCw } from 'lucide-react';
import type { StreamPicker } from '../../hooks/useStreamPicker';
import { cx } from '../../lib/cx';
import type { StreamSourceKind } from '../../lib/stream-source';
import { IconButton } from '../atoms';
import { SelectField, ToggleField } from '../molecules';
import { useT } from '../../i18n';

const KINDS: StreamSourceKind[] = ['card', 'screen', 'window'];

/** Capture type for the party plus, for screens and windows, the sources to pick from. */
export function StreamSourceSettings({
  picker: p,
  locked = false,
}: {
  picker: StreamPicker;
  /** While a capture or stream is running, the choice stays put until it stops. */
  locked?: boolean;
}) {
  const t = useT().party.source;
  return (
    <>
      <SelectField
        label={t.kind}
        value={p.kind}
        disabled={locked}
        onChange={(v) => p.setKind(v as StreamSourceKind)}
        options={KINDS.map((k) => ({ value: k, label: t[k] }))}
      />
      {p.kind !== 'card' && (
        <>
          {p.desktop ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[12px] text-[#8494a5]">{t.pick}</span>
                <IconButton
                  size="sm"
                  label={t.refresh}
                  disabled={locked || p.loading}
                  onClick={() => void p.refresh()}
                >
                  <RefreshCw size={15} />
                </IconButton>
              </div>
              {!p.sources.length && (
                <p className="py-4 text-center text-[13px] text-[#8494a5]">
                  {p.loading ? t.loading : t.empty}
                </p>
              )}
              <div
                role="listbox"
                aria-label={t[p.kind]}
                className="mb-3 grid grid-cols-2 gap-2"
              >
                {p.sources.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={p.selected === s.id}
                    disabled={locked}
                    onClick={() => p.select(s.id)}
                    className={cx(
                      'flex min-w-0 flex-col gap-1.5 rounded-lg border p-1.5 text-left',
                      p.selected === s.id
                        ? 'border-accent-border bg-[#a8f0cb12]'
                        : 'border-line-soft not-disabled:hover:bg-[#ffffff08]',
                      locked && 'cursor-default',
                    )}
                  >
                    {s.thumbnail ? (
                      <img
                        src={s.thumbnail}
                        alt=""
                        className="aspect-video w-full rounded bg-black object-contain"
                      />
                    ) : (
                      <span className="aspect-video w-full rounded bg-black" />
                    )}
                    <span className="truncate text-[12px] text-[#c3d0dd]">
                      {s.name}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="mb-3 text-[13px] text-[#a5b2c3]">{t.browserPicker}</p>
          )}
          {p.desktop && (
            <>
              <ToggleField
                label={t.desktopAudio.system.label}
                hint={t.desktopAudio.system.hint}
                checked={p.systemAudio}
                disabled={locked}
                onChange={p.setSystemAudio}
              />
              {p.kind === 'window' && (
                <ToggleField
                  label={t.desktopAudio.window.label}
                  hint={t.desktopAudio.window.hint}
                  checked={p.windowAudio}
                  disabled={locked || p.windowAudioDisabled}
                  onChange={p.setWindowAudio}
                />
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
