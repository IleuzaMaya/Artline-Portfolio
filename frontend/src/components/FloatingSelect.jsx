// frontend/src/components/FloatingSelect.jsx
import React, { useMemo } from "react";

export default function FloatingSelect({
  id,
  name,
  label,
  options = [],
  value = null,              // pode ser objeto ou id
  setValue,                  // preferível
  onChange,                  // fallback: recebe id string
  labelKey = "label",
  valueKey = "id",
  required = true,
  disabled = false,
  error = false,
}) {
  // Normaliza opções (label + value + raw)
  const items = useMemo(() => {
    return (options || []).map((opt, idx) => {
      if (opt && typeof opt === "object") {
        const v =
          opt[valueKey] ??
          opt.id ??
          opt.value ??
          opt.codigo ??
          opt.codigo_principal ??
          String(idx);
        const l =
          opt[labelKey] ??
          opt.label ??
          opt.nome ??
          opt.descricao ??
          String(v);
        return { value: String(v), label: String(l), raw: opt };
      }
      // opção simples (string/number)
      return { value: String(opt), label: String(opt), raw: opt };
    });
  }, [options, labelKey, valueKey]);

  // Id atual (quando value é objeto, extrai via valueKey)
  const currentId = useMemo(() => {
    if (value == null) return "";
    if (typeof value === "object") {
      const v =
        value[valueKey] ??
        value.id ??
        value.value ??
        value.codigo ??
        value.codigo_principal;
      return v != null ? String(v) : "";
    }
    return String(value);
  }, [value, valueKey]);

  const handleChange = (e) => {
    const selectedId = e.target.value;
    const found = items.find((i) => i.value === selectedId)?.raw ?? null;
    if (setValue) setValue(found);
    else if (onChange) onChange(selectedId);
  };

  return (
    <div className="floating-group">
      <select
        id={id}
        name={name}
        className={`floating-select${error ? " error" : ""}`}
        value={currentId}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        aria-invalid={error || undefined}
      >
        <option value="" disabled hidden>Selecione...</option>
        {items.map((it) => (
          <option key={it.value} value={it.value}>{it.label}</option>
        ))}
      </select>

      <label className="floating-label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}

