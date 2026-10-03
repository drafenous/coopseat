const rule='before:h-px before:flex-1 before:bg-[#26333f] after:h-px after:flex-1 after:bg-[#26333f]';

export function Divider({label}:{label?:string}){
 return label
  ?<div className={`mt-[18px] mb-3.5 flex items-center gap-2.5 text-[12px] text-subtle ${rule}`}>{label}</div>
  :<div className="mt-1.5 mb-[18px] h-px bg-line-soft"/>;
}
