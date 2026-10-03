import {PROVIDER_LABELS,type OAuthProvider} from '../../lib/api';
import './ProviderButton.css';

/** `compact` shows only the provider name (two-column grids); the full action stays as the accessible name. */
type Props={provider:OAuthProvider;action?:string;compact?:boolean;disabled?:boolean}&({onClick():void;href?:never}|{href:string;onClick?:never});

export function ProviderButton({provider,action='Continuar com',compact,disabled,onClick,href}:Props){
 const label=PROVIDER_LABELS[provider],text=`${action} ${label}`;
 const a11y=compact?{'aria-label':text,title:text}:{};
 const body=<><span className={`provider-mark ${provider}`} aria-hidden="true">{label[0]}</span><span className="provider-label">{compact?label:text}</span></>;
 if(href!==undefined)return <a className="provider-button" href={href} {...a11y}>{body}</a>;
 return <button type="button" className="provider-button" disabled={disabled} onClick={onClick} {...a11y}>{body}</button>;
}
