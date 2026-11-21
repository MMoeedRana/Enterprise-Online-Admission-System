'use client';

import {
  Children,
  isValidElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-xl border border-line bg-card px-3.5 text-[14px] text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-150 outline-none focus:border-primary focus:ring-1 focus:ring-[var(--ring)] disabled:opacity-60 aria-[invalid=true]:border-red-500';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(base, 'h-11', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(base, 'min-h-24 py-2.5', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const valueId = useId();
  const controlled = rest.value !== undefined;
  const initial = rest.value ?? rest.defaultValue ?? '';
  const [internal, setInternal] = useState(String(initial));
  const value = controlled ? String(rest.value ?? '') : internal;
  const options: { value: string; label: ReactNode; disabled?: boolean }[] = [];

  const collect = (nodes: ReactNode) =>
    Children.forEach(nodes, (node) => {
      if (!isValidElement(node)) return;
      const props = node.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
      if (node.type === 'option') {
        options.push({
          value: String(props.value ?? ''),
          label: props.children,
          disabled: props.disabled,
        });
      } else if (props.children) {
        collect(props.children);
      }
    });
  collect(children);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const emit = (next: string) => {
    if (!controlled) setInternal(next);
    const target = { value: next, name: rest.name } as HTMLSelectElement;
    rest.onChange?.({
      target,
      currentTarget: target,
    } as unknown as ChangeEvent<HTMLSelectElement>);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={rest['aria-label'] ?? (rest.id ? undefined : rest.title || rest.name || 'Choose an option')}
        aria-labelledby={!rest['aria-label'] && rest.id ? `${rest.id}-label ${valueId}` : undefined}
        disabled={rest.disabled}
        onBlur={rest.onBlur as unknown as FocusEventHandler<HTMLButtonElement>}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
          if (event.key === 'Escape') setOpen(false);
        }}
        className={cn(
          base,
          'flex h-11 items-center justify-between gap-3 text-left',
          open && 'border-primary ring-1 ring-[var(--ring)]',
        )}
      >
        <span id={valueId} className={cn('min-w-0 truncate', !selected && 'text-muted')}>
          {selected?.label ?? options[0]?.label ?? ''}
        </span>
        <ChevronsUpDown className={cn('size-4 shrink-0 transition', open ? 'text-primary rotate-180' : 'text-muted')} />
      </button>
      {open && (
        <div
          id={listId}
          role="listbox"
          className="border-line bg-card absolute z-[100] mt-2 max-h-64 w-full overflow-y-auto rounded-xl border p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                key={option.value}
                onClick={() => {
                  emit(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] transition',
                  active ? 'bg-primary-soft text-primary font-semibold' : 'text-ink hover:bg-card-soft',
                  option.disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {active && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
      <select
        ref={ref}
        id={rest.id}
        aria-hidden="true"
        aria-label={rest['aria-label']}
        name={rest.name}
        value={value}
        onChange={(e) => emit(e.target.value)}
        onBlur={rest.onBlur}
        disabled={rest.disabled}
        className="sr-only"
        tabIndex={-1}
      >
        {children}
      </select>
    </div>
  );
});

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        id={htmlFor ? `${htmlFor}-label` : undefined}
        className="text-ink text-[13px] font-semibold"
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[12px] font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted text-[12px]">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  return (
    <label
      className={cn('border-line bg-card flex cursor-pointer items-start gap-3 rounded-xl border p-3.5', className)}
    >
      <input type="checkbox" className="mt-0.5 size-4 rounded accent-[var(--primary)]" {...rest} />
      <span>
        <span className="text-ink block text-[13.5px] font-semibold">{label}</span>
        {description && <span className="text-muted block text-[12px]">{description}</span>}
      </span>
    </label>
  );
}
