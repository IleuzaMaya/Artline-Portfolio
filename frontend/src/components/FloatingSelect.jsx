// frontend/src/components/FloatingSelect.jsx
import React from 'react';

export default function FloatingSelect({
  id,
  name,
  label,
  value = '',
  onChange,
  options = [],                // [{ value:'', label:'' }]
  required = true,
  disabled = false,
  error = false,
}) {
  return (
    <div className="floating-group">
      <select
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        className={`floating-select${error ? ' error' : ''}`}
        value={value ?? ''}
        onChange={onChange}
      >
        {/* placeholder: força :valid só após escolha */}
        <option value="" disabled hidden>Selecione...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <label className="floating-label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
