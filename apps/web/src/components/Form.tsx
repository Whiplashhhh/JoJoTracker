import { passwordStrength, PASSWORD_STRENGTH_LABELS } from '@jojo/shared/client';
import { useId, useState, type ReactNode } from 'react';
import { EyeIcon } from './Icons';

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string | undefined;
  hint?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      {children(id, describedBy)}
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  describedBy,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  describedBy: string | undefined;
  invalid: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input">
      <input
        id={id}
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        required
      />
      <button
        type="button"
        className="password-input__toggle"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        onClick={() => {
          setVisible((v) => !v);
        }}
      >
        <EyeIcon size={20} />
      </button>
    </div>
  );
}

export function StrengthMeter({ password }: { password: string }) {
  const score = passwordStrength(password);
  if (password.length === 0) return null;
  return (
    <div className={`strength strength--${score}`} aria-live="polite">
      <span className="strength__bars" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={i <= score ? 'is-on' : ''} />
        ))}
      </span>
      <span className="strength__label">Robustesse : {PASSWORD_STRENGTH_LABELS[score]}</span>
    </div>
  );
}
