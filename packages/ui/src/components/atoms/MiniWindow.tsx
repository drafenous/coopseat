export const miniVideo =
  'block aspect-video w-full flex-none bg-[linear-gradient(135deg,#2c6b55,#1b3f5a_60%,#3d2c5a)]';
const light = 'inline-block size-[5px] rounded-full bg-[#5a6b7c]';

export function MiniWindow() {
  return (
    <div className="flex w-[min(100%,180px)] flex-col self-center overflow-hidden rounded-md border border-line-strong bg-[#1a2530]">
      <span className="flex gap-1 bg-[#24313d] px-1.5 py-[5px]">
        <i className={light} />
        <i className={light} />
        <i className={light} />
      </span>
      <span className={miniVideo} />
    </div>
  );
}
