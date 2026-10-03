import type {ReactNode} from 'react';
import './ModeCard.css';

type Props={illustration:ReactNode;icon:ReactNode;title:string;footer:ReactNode;children:ReactNode};

export function ModeCard({illustration,icon,title,footer,children}:Props){
 return <div className="mode-card">{illustration}<b>{icon} {title}</b><p>{children}</p><small>{footer}</small></div>;
}
