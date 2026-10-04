import {useCallback,useState} from 'react';
import {CHAT_HISTORY,graphemeCount,sanitizeChat,type ChatMessage} from '../party/protocol';
import {PARTY_CHAT_KEY} from '../lib/storage';

/** Ephemeral session chat: lives in memory only and is wiped when the session ends. */
export function useChat(){
 const [messages,setMessages]=useState<ChatMessage[]>([]);
 const [visible,setVisibleState]=useState(()=>{try{return localStorage.getItem(PARTY_CHAT_KEY)!=='0';}catch{return true;}});
 const [unread,setUnread]=useState(0);

 const setVisible=useCallback((v:boolean)=>{setVisibleState(v);if(v)setUnread(0);try{localStorage.setItem(PARTY_CHAT_KEY,v?'1':'0');}catch{/* storage unavailable */}},[]);
 const reset=useCallback((initial:ChatMessage[]=[])=>{setMessages(initial.slice(-CHAT_HISTORY));setUnread(0);},[]);
 const add=useCallback((msg:ChatMessage,mine:boolean)=>{
  setMessages(x=>x.some(m=>m.id===msg.id)?x:[...x,msg].slice(-CHAT_HISTORY));
  if(!mine)setUnread(n=>n+1);
 },[]);
 const remove=useCallback((id:string)=>setMessages(x=>x.filter(m=>m.id!==id)),[]);

 return {messages,visible,unread:visible?0:unread,setVisible,reset,add,remove};
}

/** Client-side mirror of the server rule, so the counter and the send button agree with it. */
export const chatLength=(text:string)=>graphemeCount(text.normalize('NFC'));
export const validChat=(text:string)=>sanitizeChat(text)!==null;
