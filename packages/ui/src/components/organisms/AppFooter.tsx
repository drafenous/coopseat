import { DonateCallout } from '../molecules';

export function AppFooter({ onDonate }: { onDonate(): void }) {
  return (
    <footer className="flex items-center justify-center px-0.5 py-[clamp(10px,1.8vh,18px)] text-[12px] text-[#8494a5] immersive:hidden">
      <DonateCallout onDonate={onDonate} />
    </footer>
  );
}
