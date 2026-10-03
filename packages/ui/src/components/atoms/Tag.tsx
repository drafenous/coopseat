import type {ReactNode} from 'react';

export function Tag({children}:{children:ReactNode}){
 return <span className="rounded border border-[#2f3b47] px-[7px] py-[3px] text-[10px] tracking-[1px] text-[#93a3b5] max-[1000px]:hidden">{children}</span>;
}
