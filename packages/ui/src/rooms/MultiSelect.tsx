'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cx } from '../lib/cx';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  /** Shown when every option is selected, or none are. */
  placeholder: string;
  options: Option<T>[];
  value: T[];
  onChange(value: T[]): void;
};

const GAP = 4;
const MARGIN = 8;
const MAX_HEIGHT = 280;

export function MultiSelect<T extends string>({
  label,
  placeholder,
  options,
  value,
  onChange,
}: Props<T>) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const listId = `${uid}-list`;
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [style, setStyle] = useState<CSSProperties>();
  const selected = options.filter((option) => value.includes(option.value));
  const summary =
    selected.length === 0 || selected.length === options.length
      ? placeholder
      : selected.map((option) => option.label).join(', ');

  const place = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - MARGIN;
    const above = rect.top - MARGIN;
    const up = below < 160 && above > below;
    setStyle({
      left: rect.left,
      width: Math.max(rect.width, 180),
      maxHeight: Math.min(MAX_HEIGHT, (up ? above : below) - GAP),
      ...(up
        ? { bottom: window.innerHeight - rect.top + GAP }
        : { top: rect.bottom + GAP }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const scroll = (event: Event) => {
      if (!list.current?.contains(event.target as Node)) place();
    };
    const down = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !list.current?.contains(target))
        setOpen(false);
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', scroll, true);
    document.addEventListener('mousedown', down);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', scroll, true);
      document.removeEventListener('mousedown', down);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${uid}-option-${active}`)?.scrollIntoView({
      block: 'nearest',
    });
  }, [open, active, uid]);

  const toggle = (option: T) => {
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => {
        const next = current + (event.key === 'ArrowDown' ? 1 : -1);
        return (next + options.length) % options.length;
      });
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[active];
      if (option) toggle(option.value);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <span id={labelId} className="text-[12px] font-semibold text-muted">
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={labelId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        className={cx(
          'flex h-9 w-[210px] min-w-0 items-center gap-2 rounded-lg border bg-field px-2.5 text-left text-[13px] text-field-text',
          open
            ? 'border-[#8bf5ca80]'
            : 'border-[#304050] hover:border-[#3d5163]',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        <ChevronDown
          size={16}
          className={cx(
            'flex-none text-[#8d9dad] transition-transform duration-150 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>
      {open &&
        style &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={labelId}
            style={style}
            className="fixed z-50 flex animate-fade-in flex-col overflow-y-auto rounded-[10px] border border-line bg-[#172230] p-1.5 shadow-[0_14px_36px_#00000090]"
          >
            {options.map((option, index) => {
              const isSelected = value.includes(option.value);
              return (
                <li
                  key={option.value}
                  id={`${uid}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => {
                    if (index !== active) setActive(index);
                  }}
                  onClick={() => toggle(option.value)}
                  className={cx(
                    'flex cursor-pointer items-center gap-2.5 rounded-[7px] px-[11px] py-2 text-[13px]',
                    index === active && 'bg-[#ffffff0f]',
                    isSelected ? 'text-accent' : 'text-[#d4dee8]',
                  )}
                >
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {isSelected && <Check size={14} className="flex-none" />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
