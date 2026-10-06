import { Clapperboard, Keyboard, Lightbulb, Maximize } from 'lucide-react';
import { Button, MiniMonitor, MiniWindow } from '../atoms';
import { Modal, ModeCard, Shortcut, StepItem } from '../molecules';
import { useT } from '../../i18n';

export function HelpModal({ onClose }: { onClose(): void }) {
  const t = useT().help;
  return (
    <Modal labelledBy="help-title" closeButton onClose={onClose}>
      <h2 id="help-title">{t.title}</h2>
      <ol className="flex flex-col gap-3.5">
        {t.steps.map((step, i) => (
          <StepItem key={step.title} step={i + 1} title={step.title}>
            {step.body}
          </StepItem>
        ))}
      </ol>
      <h3 className="mt-6 mb-2.5 text-[14px] font-semibold text-[#e8eef4]">
        {t.twoWays}
      </h3>
      <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        <ModeCard
          illustration={<MiniWindow />}
          icon={<Clapperboard size={15} />}
          title={t.cinemaTitle}
          footer={t.cinemaFooter}
        >
          {t.cinemaBody}
        </ModeCard>
        <ModeCard
          illustration={<MiniMonitor />}
          icon={<Maximize size={15} />}
          title={t.fullscreenTitle}
          footer={t.fullscreenFooter}
        >
          {t.fullscreenBody}
        </ModeCard>
      </div>
      <div className="mt-[22px] flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-[#2a3846] px-[15px] py-[13px] text-[13px] text-[#b3c0cd] [&>span]:flex [&>span]:items-center [&>span]:gap-[7px]">
        <Keyboard size={15} className="text-[#8d9dad]" />
        <Shortcut keys="F11">{t.shortcutFullscreen}</Shortcut>
        <Shortcut keys="Esc">{t.shortcutExit}</Shortcut>
        <Shortcut keys="M">{t.shortcutMute}</Shortcut>
      </div>
      <div className="mt-3 flex gap-3 rounded-[10px] bg-[#1a2733] px-[15px] py-[13px]">
        <Lightbulb size={15} className="mt-[3px] flex-none text-[#f3d18a]" />
        <div className="space-y-1.5 [&>p]:text-[13px] [&>p]:leading-[1.55]">
          {t.tips.map((tip) => (
            <p key={tip}>{tip}</p>
          ))}
        </div>
      </div>
      <Button className="mt-[22px]" onClick={onClose}>
        {t.gotIt}
      </Button>
    </Modal>
  );
}
