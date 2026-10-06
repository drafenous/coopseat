import { Heart } from 'lucide-react';
import { useT } from '../../i18n';

export function DonateCallout({ onDonate }: { onDonate(): void }) {
  const t = useT().donate;
  return (
    <span className="flex items-center gap-1.5 text-[#97a8b8]">
      {t.text}
      <button
        type="button"
        className="ml-2 inline-flex items-center gap-1.5 rounded-[20px] border border-[#b0f3d244] bg-[#b0f3d212] px-[13px] py-[7px] text-[12px] font-semibold text-accent hover:border-[#b0f3d288] hover:bg-[#b0f3d224] hover:text-accent-hover"
        onClick={onDonate}
      >
        <Heart size={13} fill="currentColor" className="text-[#f58fa6]" />{' '}
        {t.button}
      </button>
    </span>
  );
}
