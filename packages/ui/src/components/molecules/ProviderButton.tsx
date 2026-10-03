import {PROVIDER_LABELS,type OAuthProvider} from '../../lib/api';
import './ProviderButton.css';

type Props={provider:OAuthProvider;action?:string;disabled?:boolean;onClick():void};

export function ProviderButton({provider,action='Continuar com',disabled,onClick}:Props){
 const label=PROVIDER_LABELS[provider];
 return <button type="button" className="provider-button" disabled={disabled} onClick={onClick}>
  <span className={`provider-mark ${provider}`} aria-hidden="true">{label[0]}</span>{action} {label}
 </button>;
}
