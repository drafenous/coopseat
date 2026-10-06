import { miniVideo } from './MiniWindow';

export function MiniMonitor() {
  return (
    <>
      <div className="flex w-[min(100%,180px)] self-center rounded-md border-2 border-[#4a5c6e] bg-background p-[5px]">
        <span className={`${miniVideo} rounded-[2px]`} />
      </div>
      <span className="h-1.5 w-[34px] self-center rounded-b-sm bg-[#4a5c6e]" />
    </>
  );
}
