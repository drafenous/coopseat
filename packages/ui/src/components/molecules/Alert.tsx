import type {ReactNode} from 'react';

const tones={
 error:'border-[#ff9d9d40] bg-[#ff9d9d12] text-danger',
 success:'border-[#9ad9bd40] bg-[#9ad9bd12] text-ok',
 info:'border-[#b0f3d238] bg-[#b0f3d20f] text-accent',
};

export function Alert({tone='error',children}:{tone?:keyof typeof tones;children:ReactNode}){
 return <div role={tone==='error'?'alert':'status'} className={`rounded-lg border px-3 py-2.5 text-[13px] leading-[1.5] ${tones[tone]}`}>{children}</div>;
}
