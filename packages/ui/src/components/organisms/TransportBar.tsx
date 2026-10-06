import {
  Activity,
  Clapperboard,
  Keyboard,
  Maximize,
  PanelLeftOpen,
  PanelRightOpen,
  PictureInPicture2,
  Pin,
} from 'lucide-react';
import { IconButton } from '../atoms';
import { CinemaMenu, Shortcut, VolumeControl } from '../molecules';
import type { PanelSide } from '../templates/MainLayout';
import { useT } from '../../i18n';

type Props = {
  panelSide: PanelSide;
  panelOpen: boolean;
  onTogglePanel(): void;
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
};

export function TransportBar({
  panelSide,
  panelOpen,
  onTogglePanel,
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
}: Props) {
  const t = useT().transport;
  return (
    <div className="flex h-14 flex-none items-center justify-between gap-3 border-t border-[#ffffff0a] bg-[#111821] px-[13px] immersive:hidden">
      <VolumeControl
        volume={volume}
        onChange={onVolume}
        onToggleMute={onToggleMute}
      />
      <div className="flex items-center gap-3.5 text-[12px] whitespace-nowrap text-[#8d9dad] max-[1300px]:hidden [&>span]:flex [&>span]:items-center [&>span]:gap-1.5 max-[1500px]:[&>span:nth-child(3)]:hidden">
        <Keyboard size={14} className="text-subtle" />
        <Shortcut keys="F11">{t.fullscreen}</Shortcut>
        <Shortcut keys="Esc">{t.exit}</Shortcut>
        <Shortcut keys="M">{t.mute}</Shortcut>
      </div>
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
        <span className="mx-1 h-[22px] w-px bg-[#2c3946]" />
        <IconButton
          label={panelOpen ? t.collapsePanel : t.showPanel}
          selected={panelOpen}
          aria-pressed={panelOpen}
          onClick={onTogglePanel}
        >
          {panelSide === 'right' ? (
            <PanelRightOpen size={17} />
          ) : (
            <PanelLeftOpen size={17} />
          )}
        </IconButton>
      </div>
    </div>
  );
}
