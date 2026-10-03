import {PROVIDER_LABELS,type OAuthProvider} from '../../lib/providers';

/** `compact` shows only the provider name (two-column grids); the full action stays as the accessible name.
 * Hook-free so server pages can render it through `@coopseat/ui/design`; callers pass the translated `action`. */
type Props={provider:OAuthProvider;action:string;compact?:boolean;disabled?:boolean}&({onClick():void;href?:never}|{href:string;onClick?:never});

const buttonClass='flex h-[42px] w-full items-center gap-2 rounded-lg border border-line bg-field px-2.5 text-[13px] font-semibold text-field-text no-underline not-disabled:hover:border-[#3d5163] not-disabled:hover:bg-[#152130]';
const marks:Partial<Record<OAuthProvider,string>>={google:'bg-[#ea4335]',discord:'bg-[#5865f2]',x:'border border-[#444] bg-black',facebook:'bg-[#1877f2]'};

export function ProviderButton({provider,action,compact,disabled,onClick,href}:Props){
 const label=PROVIDER_LABELS[provider],text=`${action} ${label}`;
 const a11y=compact?{'aria-label':text,title:text}:{};
 const body=<><span className={`grid size-[22px] flex-none place-items-center rounded-md text-[12px] font-bold text-white ${marks[provider]??'bg-line-strong'}`} aria-hidden="true">{label[0]}</span><span className="min-w-0 truncate">{compact?label:text}</span></>;
 if(href!==undefined)return <a className={buttonClass} href={href} {...a11y}>{body}</a>;
 return <button type="button" className={buttonClass} disabled={disabled} onClick={onClick} {...a11y}>{body}</button>;
}
