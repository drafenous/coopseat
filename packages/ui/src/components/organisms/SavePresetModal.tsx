import { useState, type FormEvent } from 'react';
import { Button, FieldHint, TextInput } from '../atoms';
import { Modal, ModalActions } from '../molecules';
import { useT } from '../../i18n';

type Props = {
  existingNames: string[];
  onSave(name: string): void;
  onClose(): void;
};

export function SavePresetModal({ existingNames, onSave, onClose }: Props) {
  const T = useT(),
    t = T.savePreset;
  const [name, setName] = useState('');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name);
    onClose();
  };
  return (
    <Modal small labelledBy="save-title" onClose={onClose} onSubmit={submit}>
      <h2 id="save-title">{t.title}</h2>
      <p>{t.body}</p>
      <TextInput
        autoFocus
        aria-label={t.label}
        placeholder={t.placeholder}
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      {existingNames.includes(name.trim()) && (
        <FieldHint warn>{t.exists}</FieldHint>
      )}
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          {T.common.cancel}
        </Button>
        <Button type="submit" inline>
          {T.common.save}
        </Button>
      </ModalActions>
    </Modal>
  );
}
