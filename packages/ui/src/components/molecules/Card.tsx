import type {ReactNode} from 'react';
import './Card.css';

export function Card({title,subtitle,children}:{title:string;subtitle?:ReactNode;children:ReactNode}){
 return <section className="card">
  <h1>{title}</h1>
  {subtitle&&<p className="card-subtitle">{subtitle}</p>}
  <div className="card-body">{children}</div>
 </section>;
}
