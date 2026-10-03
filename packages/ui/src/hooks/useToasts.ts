import {useEffect,useState} from 'react';

export function useToasts(){
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(t);},[notice]);
 return {error,setError,notice,setNotice};
}
