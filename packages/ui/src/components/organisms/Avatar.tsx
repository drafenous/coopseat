import {useState} from 'react';
import {cx} from '../../lib/cx';
import type {Account} from '../../lib/api';

export function Avatar({account,small}:{account:Account;small?:boolean}){
 const [broken,setBroken]=useState(false);
 const initial=(account.nickname??account.email??'?')[0].toUpperCase();
 return account.avatarUrl&&!broken
  ?<img className={cx('avatar',small&&'small')} src={account.avatarUrl} alt="" referrerPolicy="no-referrer" onError={()=>setBroken(true)}/>
  :<span className={cx('avatar',small&&'small')} aria-hidden="true">{initial}</span>;
}
