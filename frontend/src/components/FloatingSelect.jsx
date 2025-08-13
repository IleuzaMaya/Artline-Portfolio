// frontend/src/components/FloatingSelect.jsx
import React from 'react';

export default function FloatingSelect({
  label,
  options,
  value,
  setValue,
  disabled = false,
  labelKey = 'nome',
  valueKey = 'id',
  placeholder = 'Selecione...',
  error = false,
}) {
  // Normaliza options em Array
  const normalizeOptions = (opts) => {
    if (!opts) return [];
    if (Array.isArray(opts)) return opts;
    if (typeof opts === 'object') {
      if (Array.isArray(opts.rows)) return opts.rows;
      return Object.values(opts);
    }
    return [];
  };
  const safeOptions = normalizeOptions(options || []);

  const getId = (item) => {
    if (item == null || typeof item !== 'object') return item;
    return item[valueKey] ?? item.id ?? item.value ?? item.codigo ?? item.chave ?? JSON.stringify(item);
  };
  const getLabel = (item) => {
    if (item == null) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    return item[labelKey] ?? item.label ?? item.nome ?? item.titulo ?? String(getId(item));
  };

  const selectedId = (value && typeof value === 'object') ? getId(value) : (value ?? '');

  const handleChange = (e) => {
    const newId = e.target.value;
    const found = safeOptions.find((o) => String(getId(o)) === String(newId));
    setValue(found ?? null); // mantém convenção: enviar OBJETO
  };

  return (
    <div className="floating-group">
      <select
        className={`floating-select${error ? ' error' : ''}`}
        disabled={disabled || safeOptions.length === 0}
        onChange={handleChange}
        value={selectedId}
        required
      >
        <option value="">{placeholder}</option>
        {safeOptions.map((opt) => {
          const id = getId(opt);
          const text = getLabel(opt);
          return (
            <option key={String(id)} value={String(id)}>
              {text}
            </option>
          );
        })}
      </select>
      <label className="floating-label">{label}</label>
    </div>
  );
}
