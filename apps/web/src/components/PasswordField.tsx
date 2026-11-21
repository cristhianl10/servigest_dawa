import { useId, useState, type InputHTMLAttributes } from 'react';
import { Icon } from './Icon';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  hint?: string;
};

export function PasswordField({ label, hint, id, ...inputProps }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const [visible, setVisible] = useState(false);

  return (
    <label className="field password-field" htmlFor={inputId}>
      <span>{label}</span>
      <span className="password-control">
        <input
          {...inputProps}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-describedby={hintId}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={17} />
        </button>
      </span>
      {hint && <small id={hintId}>{hint}</small>}
    </label>
  );
}
