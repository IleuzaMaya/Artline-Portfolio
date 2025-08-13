// frontend/src/components/FloatingInput.jsx
import React from 'react';

export default function FloatingInput({
  label,
  type = 'text',
  value = '',              // evita uncontrolled
  onChange,
  step = 'any',
  error = false,
}) {
  return (
    <div className="floating-group">
      <input
        type={type}
        className={`floating-input${error ? ' error' : ''}`}
        value={value}
        onChange={onChange}
        step={step}
        inputMode={type === 'number' ? 'decimal' : undefined}
        pattern={type === 'number' ? '[0-9]*[.,]?[0-9]*' : undefined}
        onWheel={(e) => type === 'number' && e.currentTarget.blur()} // impede mudar valor ao rolar
        placeholder=" "
        required
      />
      <label className="floating-label">{label}</label>
    </div>
  );
}
