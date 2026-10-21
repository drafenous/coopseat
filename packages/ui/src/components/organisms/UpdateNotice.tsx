import { useT } from '../../i18n';

type Props = {
  version: string;
  onDownload(): void;
  onDismiss(): void;
};

/** Shown under the header when a newer desktop release is already published. */
export function UpdateNotice({ version, onDownload, onDismiss }: Props) {
  const t = useT().update;
  return (
    <div
      role="status"
      className="flex flex-none flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-[#ffffff0d] bg-[#14202a] px-[clamp(16px,2.5vw,48px)] py-2 text-[13px] text-[#d5dee6] immersive:hidden"
    >
      <span>{t.available(version)}</span>
      <button
        type="button"
        className="border-0 bg-transparent p-0 font-semibold text-accent"
        onClick={onDownload}
      >
        {t.download}
      </button>
      <button
        type="button"
        className="border-0 bg-transparent p-0 text-[#97a6b3]"
        onClick={onDismiss}
      >
        {t.later}
      </button>
    </div>
  );
}
