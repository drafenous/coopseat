import type { InputHTMLAttributes, ReactNode } from 'react';
import { FieldHint, TextInput } from '../atoms';

export const fieldClass =
  'mb-4 flex flex-col gap-[7px] text-[13px] text-[#a5b4c3] min-[1800px]:text-[14px]';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
};

export function Field({ label, error, hint, ...rest }: Props) {
  return (
    <label className={fieldClass}>
      {label}
      <TextInput aria-invalid={error ? true : undefined} {...rest} />
      {error ? (
        <FieldHint warn flush>
          {error}
        </FieldHint>
      ) : hint ? (
        <FieldHint muted flush>
          {hint}
        </FieldHint>
      ) : null}
    </label>
  );
}
