import {useState,type FormEvent} from 'react';
import {Button,FieldHint,TextInput} from '../atoms';
import {Modal} from '../molecules';

type Props={existingNames:string[];onSave(name:string):void;onClose():void};

export function SavePresetModal({existingNames,onSave,onClose}:Props){
 const [name,setName]=useState('');
 const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!name.trim())return;onSave(name);onClose();};
 return <Modal small labelledBy="save-title" onClose={onClose} onSubmit={submit}>
  <h2 id="save-title">Salvar preset</h2>
  <p>Guarda a placa, o áudio, o formato de imagem e as opções atuais.</p>
  <TextInput autoFocus aria-label="Nome do preset" placeholder="Ex.: Nintendo Switch" maxLength={40} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/>
  {existingNames.includes(name.trim())&&<FieldHint warn>Já existe um preset com esse nome. Ele será substituído.</FieldHint>}
  <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Salvar</Button></div>
 </Modal>;
}
