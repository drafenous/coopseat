import { Dot } from '../atoms';
import { useT } from '../../i18n';

export type CaptureStatus = 'idle' | 'busy' | 'live';

export function StatusPill({ status }: { status: CaptureStatus }) {
  const labels = useT().status;
  const live = status === 'live';
  return (
    <span
      className={`flex items-center gap-2 rounded-[20px] border px-[13px] py-[7px] text-[13px] max-[750px]:text-[12px] ${live ? 'border-[#b0f3d266] bg-[#b0f3d20d] text-accent' : 'border-[#33404b] text-[#b3c0cd]'}`}
    >
      <Dot tone={status} glow={live} />
      {labels[status]}
    </span>
  );
}
