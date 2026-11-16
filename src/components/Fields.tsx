import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface FieldBase {
  /** Visible label. */
  label: string;
  hint?: string;
  /** Error message; marks the control invalid. */
  error?: string;
  disabled?: boolean;
  className?: string;
}

function describedBy(hintId: string, errorId: string, hint?: string, error?: string): string | undefined {
  return [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
}

function FieldNotes({ hintId, errorId, hint, error }: { hintId: string; errorId: string; hint?: string; error?: string }) {
  return (
    <>
      {hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field__error">
          {error}
        </p>
      ) : null}
    </>
  );
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SelectFieldProps<T extends string = string> extends FieldBase {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  name?: string;
}

export function SelectField<T extends string = string>({
  label,
  hint,
  error,
  disabled,
  className,
  value,
  onChange,
  options,
  name,
}: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div className={['field', className ?? ''].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        className="field__control field__control--select"
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(`${id}-hint`, `${id}-error`, hint, error)}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldNotes hintId={`${id}-hint`} errorId={`${id}-error`} hint={hint} error={error} />
    </div>
  );
}

export interface TextFieldProps extends FieldBase {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'search' | 'url' | 'email';
  placeholder?: string;
  name?: string;
  /** Renders a textarea (used for pasted backups). */
  multiline?: boolean;
  rows?: number;
  /** Shows a "Hapus teks" button while there is text. */
  clearable?: boolean;
  /** Icon shown inside the field, before the text. */
  icon?: ReactNode;
  readOnly?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  enterKeyHint?: HTMLAttributes<HTMLInputElement>['enterKeyHint'];
  autoComplete?: string;
  spellCheck?: boolean;
}

export function TextField({
  label,
  hint,
  error,
  disabled,
  className,
  value,
  onChange,
  type = 'text',
  placeholder,
  name,
  multiline = false,
  rows = 5,
  clearable = false,
  icon,
  readOnly,
  autoFocus,
  maxLength,
  inputMode,
  enterKeyHint,
  autoComplete = 'off',
  spellCheck,
}: TextFieldProps) {
  const id = useId();
  const shared = {
    id,
    name,
    value,
    placeholder,
    disabled,
    readOnly,
    autoFocus,
    maxLength,
    spellCheck,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': describedBy(`${id}-hint`, `${id}-error`, hint, error),
  };
  return (
    <div className={['field', className ?? ''].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className={icon ? 'field__box field__box--icon' : 'field__box'}>
        {icon ? (
          <span className="field__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {multiline ? (
          <textarea
            {...shared}
            rows={rows}
            className="field__control field__control--area"
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            {...shared}
            type={type}
            inputMode={inputMode}
            enterKeyHint={enterKeyHint}
            autoComplete={autoComplete}
            className="field__control"
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {clearable && value !== '' && !disabled && !readOnly ? (
          <button
            type="button"
            className="field__clear"
            aria-label="Hapus teks"
            title="Hapus teks"
            onClick={() => {
              onChange('');
              document.getElementById(id)?.focus();
            }}
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <FieldNotes hintId={`${id}-hint`} errorId={`${id}-error`} hint={hint} error={error} />
    </div>
  );
}

export interface SwitchProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({ label, hint, checked, onChange, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={['switch', className ?? ''].filter(Boolean).join(' ')}>
      <div className="switch__text">
        <label className="switch__label" htmlFor={id}>
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="field__hint">
            {hint}
          </p>
        ) : null}
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="switch__input"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}

export interface RadioOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export interface RadioGroupProps<T extends string = string> {
  /** Group label (rendered as the fieldset legend). */
  label: string;
  hint?: string;
  value: T;
  onChange: (value: T) => void;
  options: RadioOption<T>[];
  disabled?: boolean;
  className?: string;
}

export function RadioGroup<T extends string = string>({ label, hint, value, onChange, options, disabled, className }: RadioGroupProps<T>) {
  const id = useId();
  return (
    <fieldset
      className={['radio-group', className ?? ''].filter(Boolean).join(' ')}
      disabled={disabled}
      aria-describedby={hint ? `${id}-hint` : undefined}
    >
      <legend className="field__label">{label}</legend>
      {hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
      <div className="radio-group__options">
        {options.map((option) => {
          const optionId = `${id}-${option.value}`;
          return (
            <div key={option.value} className="radio">
              <input
                id={optionId}
                type="radio"
                name={id}
                className="radio__input"
                value={option.value}
                checked={option.value === value}
                aria-describedby={option.hint ? `${optionId}-hint` : undefined}
                onChange={() => onChange(option.value)}
              />
              <div className="radio__text">
                <label htmlFor={optionId} className="radio__label">
                  {option.label}
                </label>
                {option.hint ? (
                  <p id={`${optionId}-hint`} className="field__hint">
                    {option.hint}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
