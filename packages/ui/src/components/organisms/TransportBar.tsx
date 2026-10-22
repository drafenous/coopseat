import { useState } from 'react';
import {
  Activity,
  Clapperboard,
  Flag,
  Keyboard,
  Maximize,
  PictureInPicture2,
  Pin,
} from 'lucide-react';
import { IconButton } from '../atoms';
import { CinemaMenu, VolumeControl } from '../molecules';
import { useT } from '../../i18n';
import { ShortcutsModal } from './ShortcutsModal';

type Props = {
  volume: number;
  onVolume(volume: number): void;
  onToggleMute(): void;
  showStats: boolean;
  onToggleStats(): void;
  top: boolean;
  canPin: boolean;
  onPin(): void;
  pipActive: boolean;
  canPip: boolean;
  onPip(): void;
  cinemaActive: boolean;
  canCinema: boolean;
  onCinema(): void;
  autoCinema: boolean;
  cinemaDelay: number;
  cinemaMenu: boolean;
  onCinemaMenu(open: boolean): void;
  onAutoCinema(auto: boolean): void;
  onCinemaDelay(delay: number): void;
  onFullscreen(): void;
  onReport(): void;
};

export function TransportBar({
  volume,
  onVolume,
  onToggleMute,
  showStats,
  onToggleStats,
  top,
  canPin,
  onPin,
  pipActive,
  canPip,
  onPip,
  cinemaActive,
  canCinema,
  onCinema,
  autoCinema,
  cinemaDelay,
  cinemaMenu,
  onCinemaMenu,
  onAutoCinema,
  onCinemaDelay,
  onFullscreen,
  onReport,
}: Props) {
  const all = useT();
  const t = all.transport;
  const [shortcuts, setShortcuts] = useState(false);
  return (
    <>
      <div className="flex h-14 flex-none items-center justify-between gap-3 border-t border-[#ffffff0a] bg-[#111821] px-[13px] immersive:hidden">
        <VolumeControl
          volume={volume}
          onChange={onVolume}
          onToggleMute={onToggleMute}
        />
        <IconButton
          label={t.shortcuts}
          title={t.shortcutsTitle}
          onClick={() => setShortcuts(true)}
        >
          <Keyboard size={17} />
        </IconButton>
        <div className="flex items-center gap-1.5">
          <IconButton
            label={t.stats}
            selected={showStats}
            aria-pressed={showStats}
            onClick={onToggleStats}
          >
            <Activity size={17} />
          </IconButton>
          <IconButton
            label={t.alwaysOnTop}
            selected={top}
            aria-pressed={top}
            disabled={!canPin}
            onClick={onPin}
          >
            <Pin size={17} />
          </IconButton>
          <IconButton
            label={t.pip}
            title={t.pipTitle}
            selected={pipActive}
            aria-pressed={pipActive}
            disabled={!canPip}
            onClick={onPip}
          >
            <PictureInPicture2 size={17} />
          </IconButton>
          <span className="mx-1 h-[22px] w-px bg-[#2c3946]" />
          <IconButton
            label={t.cinema}
            title={t.cinemaTitle}
            text={t.cinemaText}
            selected={cinemaActive}
            disabled={!canCinema}
            onClick={onCinema}
          >
            <Clapperboard size={17} />
          </IconButton>
          <CinemaMenu
            auto={autoCinema}
            delay={cinemaDelay}
            open={cinemaMenu}
            onOpenChange={onCinemaMenu}
            onAuto={onAutoCinema}
            onDelay={onCinemaDelay}
          />
          <IconButton
            label={t.fullscreenLabel}
            title={t.fullscreenTitle}
            text={t.fullscreenText}
            onClick={onFullscreen}
          >
            <Maximize size={17} />
          </IconButton>
          <IconButton
            label={all.report.open}
            title={all.report.openTitle}
            onClick={onReport}
          >
            <Flag size={17} />
          </IconButton>
        </div>
      </div>
      {shortcuts && <ShortcutsModal onClose={() => setShortcuts(false)} />}
    </>
  );
}
