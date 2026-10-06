import { CircleAlert, Clapperboard, Info } from 'lucide-react';
import { COUNTDOWN_FROM, type Countdown } from '../../lib/settings';
import { Toast } from '../molecules';
import { useT } from '../../i18n';

type Props = {
  countdown: Countdown;
  onEnterCinema(): void;
  onDisableAutoCinema(): void;
  error: string;
  onCloseError(): void;
  onTroubleshoot(): void;
  notice: string;
  onCloseNotice(): void;
};

const action =
  'rounded-md border px-3 py-1.5 text-[12px] font-semibold hover:brightness-110';
const detail = 'mt-0.5 block text-[12px] text-[#93b3a5]';

export function ToastStack({
  countdown,
  onEnterCinema,
  onDisableAutoCinema,
  error,
  onCloseError,
  onTroubleshoot,
  notice,
  onCloseNotice,
}: Props) {
  const t = useT().toasts;
  return (
    <div className="pointer-events-none fixed right-[clamp(16px,2.5vw,48px)] bottom-[clamp(16px,3vh,32px)] z-40 flex w-[min(420px,calc(100vw-32px))] flex-col items-end gap-2.5">
      {countdown !== null && (
        <Toast
          variant="countdown"
          role="status"
          aria-live="polite"
          icon={<Clapperboard size={16} />}
        >
          {countdown === 'paused' ? (
            <>
              {t.cinemaPaused}
              <small className={detail}>{t.stayStill}</small>
            </>
          ) : (
            <>
              {t.enteringIn}{' '}
              {Array.from(
                { length: COUNTDOWN_FROM - countdown + 1 },
                (_, i) => (
                  <b key={i} className="font-bold text-accent tabular-nums">
                    {COUNTDOWN_FROM - i}...{' '}
                  </b>
                ),
              )}
              <small className={detail}>{t.moveToPause}</small>
            </>
          )}
          <span className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${action} border-accent bg-accent text-accent-ink`}
              onClick={onEnterCinema}
            >
              {t.enterNow}
            </button>
            <button
              type="button"
              className={`${action} border-[#b0f3d255] bg-[#b0f3d214] text-[#cdf8e3]`}
              onClick={onDisableAutoCinema}
            >
              {t.disableAuto}
            </button>
          </span>
        </Toast>
      )}
      {error && (
        <Toast
          variant="error"
          role="alert"
          icon={<CircleAlert size={16} />}
          onClose={onCloseError}
        >
          {error}
          <span className="mt-2.5 flex">
            <button
              type="button"
              className={`${action} border-[#f59a8b55] bg-[#f59a8b14] text-[#fbd3cb]`}
              onClick={onTroubleshoot}
            >
              {t.seeSolutions}
            </button>
          </span>
        </Toast>
      )}
      {notice && (
        <Toast
          key={notice}
          role="status"
          icon={<Info size={16} />}
          onClose={onCloseNotice}
        >
          {notice}
        </Toast>
      )}
    </div>
  );
}
