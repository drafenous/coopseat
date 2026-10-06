import { Volume2, VolumeX } from 'lucide-react';
import { IconButton } from '../atoms';
import { useT } from '../../i18n';

export function VolumeControl({
  volume,
  onChange,
  onToggleMute,
}: {
  volume: number;
  onChange(volume: number): void;
  onToggleMute(): void;
}) {
  const t = useT().volume;
  return (
    <div className="flex items-center gap-1.5">
      <IconButton
        label={volume ? t.mute : t.unmute}
        title={t.muteTitle}
        onClick={onToggleMute}
      >
        {volume ? <Volume2 size={19} /> : <VolumeX size={19} />}
      </IconButton>
      <input
        className="m-0.5 h-[3px] w-24 accent-[#abebcd]"
        aria-label={t.volume}
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ml-1.5 min-w-9 text-[12px] text-[#a5b2c3] tabular-nums">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}
