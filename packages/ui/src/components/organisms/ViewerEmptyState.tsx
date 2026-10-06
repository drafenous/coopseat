import { ArrowUpRight, Cable, ChevronRight, Monitor } from 'lucide-react';
import { Button } from '../atoms';
import { CaptureButton, ChecklistItem } from '../molecules';
import { useT } from '../../i18n';

const symbol =
  'relative mx-auto mb-[22px] flex h-[78px] w-[84px] items-center justify-center rounded-[23px] border border-[#3a57504d] bg-[linear-gradient(140deg,#253638,#111d21)] text-[#a3d8c4] shadow-[0_8px_60px_#a4f0cd0a] short:hidden';
const connection =
  'mt-[22px] flex items-center justify-center gap-3 text-[10px] tracking-[1px] text-[#8494a3] max-[1000px]:gap-1.5 max-[1000px]:text-[9px] [&>span]:rounded-[5px] [&>span]:border [&>span]:border-[#2f3b44] [&>span]:px-[9px] [&>span]:py-1.5';

type Props = {
  busy: boolean;
  hasDevices: boolean;
  videoName?: string;
  audioName?: string;
  formatLabel: string;
  needsPermission: boolean;
  canStart: boolean;
  onStart(): void;
  onStop(): void;
  onPermit(): void;
};

export function ViewerEmptyState({
  busy,
  hasDevices,
  videoName,
  audioName,
  formatLabel,
  needsPermission,
  canStart,
  onStart,
  onStop,
  onPermit,
}: Props) {
  const t = useT().emptyState;
  return (
    <div className="relative flex max-w-[460px] flex-col items-center p-6 text-center">
      <div className={symbol}>
        <Monitor size={42} strokeWidth={1.2} />
        <span className="absolute -right-[7px] -bottom-[7px] flex rounded-[11px] border-4 border-[#0d161a] bg-[#aaf0ce] p-[5px] text-[#1e493a]">
          <Cable size={17} />
        </span>
      </div>
      <h2 className="mb-3.5 text-[22px] font-[550] tracking-[-0.4px] max-[1000px]:text-[19px] min-[1800px]:text-[26px]">
        {busy ? t.preparing : hasDevices ? t.ready : t.connect}
      </h2>
      {hasDevices ? (
        <ul className="flex w-full flex-col gap-2 text-left">
          <ChecklistItem status={videoName ? 'ok' : 'warn'} title={t.card}>
            {videoName || t.chooseCard}
          </ChecklistItem>
          <ChecklistItem status={audioName ? 'ok' : 'neutral'} title={t.audio}>
            {audioName || t.noAudio}
          </ChecklistItem>
          <ChecklistItem
            status={formatLabel ? 'ok' : 'neutral'}
            title={t.image}
          >
            {formatLabel || t.detecting}
          </ChecklistItem>
        </ul>
      ) : (
        <>
          <p>{t.instructions}</p>
          <div className={connection}>
            <span>{t.console}</span>
            <ChevronRight size={14} />
            <span>{t.usb}</span>
            <ChevronRight size={14} />
            <span>{t.computer}</span>
          </div>
        </>
      )}
      {needsPermission ? (
        <Button hero onClick={onPermit}>
          <ArrowUpRight size={18} /> {t.permit}
        </Button>
      ) : (
        <CaptureButton
          hero
          running={false}
          busy={busy}
          canStart={canStart}
          onStart={onStart}
          onStop={onStop}
        />
      )}
    </div>
  );
}
