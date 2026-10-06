import { Switch } from '../atoms';

type Props = {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange(checked: boolean): void;
};

export function ToggleField({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: Props) {
  return (
    <label className="flex items-center justify-between gap-3 pt-1.5 pb-3.5 text-[14px] text-[#c9d4de]">
      <span>
        {label}
        <span className="mt-[3px] block text-[12px] text-[#8494a5]">
          {hint}
        </span>
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
