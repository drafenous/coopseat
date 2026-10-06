import { useId } from 'react';
import { Select, type SelectProps, type SelectValue } from '../atoms';
import { fieldClass } from './Field';

export function SelectField<T extends SelectValue>({
  label,
  ...rest
}: SelectProps<T> & { label: string }) {
  const id = useId(),
    labelId = `${id}-label`;
  return (
    <div className={fieldClass}>
      <label id={labelId} htmlFor={id}>
        {label}
      </label>
      <Select id={id} labelledBy={labelId} {...rest} />
    </div>
  );
}
