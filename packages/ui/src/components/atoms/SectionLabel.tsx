import type {ReactNode} from 'react';
import './SectionLabel.css';

export function SectionLabel({icon,children}:{icon:ReactNode;children:ReactNode}){
 return <div className="section-label">{icon} {children}</div>;
}
