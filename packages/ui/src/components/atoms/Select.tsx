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
import { cx } from '../../lib/cx';

export type SelectValue = string | number;
export type SelectOption<T extends SelectValue> = {
  value: T;
  label: string;
  disabled?: boolean;
};
export type SelectProps<T extends SelectValue> = {
  value: T;
  options: SelectOption<T>[];
  onChange(value: T): void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  labelledBy?: string;
  'aria-label'?: string;
};

const GAP = 4,
  MARGIN = 8,
  MAX_HEIGHT = 280;

export function Select<T extends SelectValue>({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  className,
  id,
  labelledBy,
  'aria-label': ariaLabel,
}: SelectProps<T>) {
  const uid = useId(),
    buttonId = id ?? `${uid}-button`,
    valueId = `${uid}-value`,
    listId = `${uid}-list`,
    optionId = (i: number) => `${uid}-option-${i}`;
  const trigger = useRef<HTMLButtonElement>(null),
    list = useRef<HTMLUListElement>(null),
    typed = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [style, setStyle] = useState<CSSProperties>();
  const selectedIndex = options.findIndex((o) => o.value === value),
    selected = options[selectedIndex];

  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir)
      if (!options[i].disabled) return i;
    return from;
  };
  const first = () => step(-1, 1),
    last = () => step(options.length, -1);
  const show = () => {
    if (disabled || !options.length) return;
    setActive(
      selectedIndex >= 0 && !options[selectedIndex].disabled
        ? selectedIndex
        : first(),
    );
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    setOpen(false);
    if (o.value !== value) onChange(o.value);
  };

  const place = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect(),
      below = window.innerHeight - r.bottom - MARGIN,
      above = r.top - MARGIN,
      up = below < 200 && above > below;
    setStyle({
      left: r.left,
      width: r.width,
      maxHeight: Math.min(MAX_HEIGHT, (up ? above : below) - GAP),
      ...(up
        ? { bottom: window.innerHeight - r.top + GAP }
        : { top: r.bottom + GAP }),
    });
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    place();
    const scroll = (e: Event) => {
      if (!list.current?.contains(e.target as Node)) place();
    };
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!trigger.current?.contains(t) && !list.current?.contains(t))
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
    if (open && active >= 0)
      document
        .getElementById(`${uid}-option-${active}`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [open, active, uid]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const typeahead = (key: string) => {
    const now = Date.now(),
      t = typed.current;
    t.text = now - t.at > 600 ? key : t.text + key;
    t.at = now;
    const q = t.text.toLowerCase(),
      start = Math.max(0, t.text.length > 1 ? active : active + 1);
    for (let n = 0; n < options.length; n++) {
      const i = (start + n) % options.length;
      if (
        !options[i].disabled &&
        options[i].label.toLowerCase().startsWith(q)
      ) {
        setActive(i);
        return;
      }
    }
  };
  const keyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    const handled = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    switch (e.key) {
      case 'ArrowDown':
        handled();
        setActive((i) => step(i, 1));
        break;
      case 'ArrowUp':
        handled();
        setActive((i) => step(i, -1));
        break;
      case 'Home':
        handled();
        setActive(first());
        break;
      case 'End':
        handled();
        setActive(last());
        break;
      case 'Enter':
      case ' ':
        handled();
        choose(active);
        break;
      case 'Escape':
        handled();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          handled();
          typeahead(e.key);
        }
    }
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        id={buttonId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && active >= 0 ? optionId(active) : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined}
        disabled={disabled || !options.length}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={keyDown}
        className={cx(
          'flex h-10 w-full min-w-0 items-center gap-2 rounded-[7px] border bg-field px-2.5 text-left text-[13px] text-field-text min-[1800px]:h-11 min-[1800px]:text-[14px]',
          open
            ? 'border-[#8bf5ca80]'
            : 'border-[#304050] not-disabled:hover:border-[#3d5163]',
          className,
        )}
      >
        <span
          id={valueId}
          className={cx('min-w-0 flex-1 truncate', !selected && 'text-subtle')}
        >
          {selected?.label ?? placeholder ?? ''}
        </span>
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
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : ariaLabel}
            style={style}
            className="fixed z-50 flex animate-fade-in flex-col overflow-y-auto rounded-[10px] border border-line bg-[#172230] p-1.5 shadow-[0_14px_36px_#00000090] [scrollbar-color:#2a3846_transparent] [scrollbar-width:thin]"
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={String(o.value)}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => {
                    if (!o.disabled && i !== active) setActive(i);
                  }}
                  onClick={() => choose(i)}
                  className={cx(
                    'flex flex-none items-center gap-2.5 rounded-[7px] px-[11px] py-2 text-[13px] min-[1800px]:text-[14px]',
                    o.disabled ? 'cursor-default opacity-45' : 'cursor-pointer',
                    i === active && !o.disabled && 'bg-[#ffffff0f]',
                    isSelected ? 'text-accent' : 'text-[#d4dee8]',
                  )}
                >
                  <span className="min-w-0 flex-1 break-words">{o.label}</span>
                  {isSelected && <Check size={14} className="flex-none" />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
