import type { InputHTMLAttributes } from 'react';

const track =
  'relative m-0 h-[22px] w-[38px] flex-none cursor-pointer appearance-none rounded-[22px] border border-line-strong bg-[#2a3846] transition-[background-color,border-color] duration-150 checked:border-[#7fd8b0] checked:bg-[#5fbf95] disabled:cursor-default disabled:opacity-40 motion-reduce:transition-none';
const knob =
  'before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-[#c3cedb] before:transition-[translate,background-color] before:duration-150 checked:before:translate-x-4 checked:before:bg-white motion-reduce:before:transition-none';

export function Switch(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>,
) {
  return <input className={`${track} ${knob}`} type="checkbox" {...props} />;
}
