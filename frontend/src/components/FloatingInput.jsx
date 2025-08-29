// frontend/src/components/FloatingInput.jsx

// frontend/src/components/FloatingInput.jsx
import React from 'react';

export default function FloatingInput({
  id,
  name,
  label,
  type = 'text',
  value = '',
  onChange,
  step = 'any',
  min,
  max,
  required = true,
  error = false,
  autoComplete = 'off',
  disabled = false,
  enterKeyHint = 'next',
}) {
  const isNumber = type === 'number';
  const isEmail  = type === 'email';

  return (
    <div className="floating-group">
      <input
        id={id}
        name={name}
        type={type}
        className={`floating-input${error ? ' error' : ''}`}
        value={value ?? ''}
        onChange={onChange}
        step={isNumber ? step : undefined}
        min={isNumber ? min : undefined}
        max={isNumber ? max : undefined}
        inputMode={isNumber ? 'decimal' : (isEmail ? 'email' : undefined)}
        pattern={isNumber ? '[0-9]*([.,][0-9]+)?' : undefined}
        onWheel={isNumber ? (e) => e.currentTarget.blur() : undefined}
        onKeyDown={isNumber ? (e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
        } : undefined}
        placeholder=" "
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error || undefined}
        enterKeyHint={enterKeyHint}
        spellCheck={false}
      />
      <label className="floating-label" htmlFor={id}>{label}</label>
    </div>
  );
}
