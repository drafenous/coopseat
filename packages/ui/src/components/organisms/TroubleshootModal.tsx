import type { ReactNode } from 'react';
import {
  ChevronDown,
  Gauge,
  Globe,
  MonitorOff,
  Plug,
  ShieldAlert,
  ShieldCheck,
  Usb,
  Volume2,
  Wrench,
} from 'lucide-react';
import { Button } from '../atoms';
import { Modal } from '../molecules';
import { useT } from '../../i18n';

const ICONS: Record<string, ReactNode> = {
  'not-listed': <Usb size={16} />,
  black: <MonitorOff size={16} />,
  busy: <Plug size={16} />,
  browser: <Globe size={16} />,
  windows: <ShieldCheck size={16} />,
  antivirus: <ShieldAlert size={16} />,
  audio: <Volume2 size={16} />,
  lag: <Gauge size={16} />,
  native: <Wrench size={16} />,
};

export function TroubleshootModal({
  desktop,
  onClose,
}: {
  desktop: boolean;
  onClose(): void;
}) {
  const T = useT(),
    t = T.troubleshoot;
  return (
    <Modal labelledBy="troubleshoot-title" closeButton onClose={onClose}>
      <h2 id="troubleshoot-title">{t.title}</h2>
      <p className="-mt-2.5 mb-4 text-[13px] text-muted">{t.intro}</p>
      <div className="flex flex-col gap-2">
        {t.issues(desktop).map((issue) => (
          <details
            key={issue.id}
            className="group rounded-[10px] border border-[#2a3846] bg-[#ffffff04] open:bg-[#1a2733]"
          >
            <summary className="flex cursor-pointer list-none items-center rounded-[10px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#8bf5ca] gap-2.5 px-[15px] py-3 text-[14px] font-[550] text-[#dbe4ed] [&::-webkit-details-marker]:hidden">
              <span className="flex-none text-[#9aabbb]">
                {ICONS[issue.id]}
              </span>
              <span className="flex-1">{issue.title}</span>
              <ChevronDown
                size={16}
                className="flex-none text-[#8d9dad] transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <ol className="list-decimal space-y-2 pr-[15px] pb-3.5 pl-[46px] text-[13px] leading-[1.55] text-[#b3c0cd] marker:text-[#6f8193] [&_strong]:font-semibold [&_strong]:text-[#e1eaf2]">
              {issue.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </details>
        ))}
      </div>
      <Button className="mt-[22px]" onClick={onClose}>
        {T.common.close}
      </Button>
    </Modal>
  );
}
