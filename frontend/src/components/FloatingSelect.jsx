// frontend/src/components/FloatingSelect.jsx
import React from 'react';

/**
 * Select com label flutuante.
 * - options: array de objetos OU strings.
 * - value: objeto selecionado (ou string/number).
 * - setValue: callback que recebe o objeto selecionado (ou null).
 * - labelKey/valueKey: quais chaves usar do objeto (padrão 'nome'/'id').
 */
export default function FloatingSelect({
  id,
  name,
  label,
  value = null,
  setValue,                 // preferível no seu app
  onChange,                 // fallback se não tiver setValue
  options = [],
  labelKey = 'nome',
  valueKey = 'id',
  required = true,
  disabled = false,
  error = false,
}) {
  // pega "valor" que será colocado no atributo value da <option>
  const optValueOf = (opt) => {
    if (opt == null) return '';
    if (typeof opt !== 'object') return String(opt);
    const tryKeys = [valueKey, 'id', 'value', 'codigo_principal', 'codigo', 'slug', 'nome'];
    for (const k of tryKeys) {
      if (k && opt[k] != null && opt[k] !== '') return String(opt[k]);
    }
    return JSON.stringify(opt); // fallback
  };

  // pega o texto da opção
  const optLabelOf = (opt) => {
    if (opt == null) return '';
    if (typeof opt !== 'object') return String(opt);
    const tryKeys = [labelKey, 'display', 'nome', 'descricao', 'label', 'title', 'name'];
    for (const k of tryKeys) {
      if (k && opt[k]) return String(opt[k]);
    }
    const cod = opt.codigo_principal || opt.codigo || '';
    const nm  = opt.nome || opt.name || '';
    return [cod, nm].filter(Boolean).join(' — ') || String(optValueOf(opt));
  };

  // valor controlado do <select> (DOM)
  const domValue = (() => {
    if (value == null) return '';
    return typeof value === 'object' ? optValueOf(value) : String(value);
  })();

  const handleChange = (e) => {
    const v = e.target.value;
    // encontra o objeto correspondente
    const picked =
      options.find((o) => String(optValueOf(o)) === String(v)) ?? null;

    if (typeof setValue === 'function') {
      setValue(picked);
    } else if (typeof onChange === 'function') {
      // mantém compatibilidade: envia o event
      onChange(e);
    }
  };

  return (
    <div className="floating-group">
      <select
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        className={`floating-select${error ? ' error' : ''}`}
        value={domValue}
        onChange={handleChange}
      >
        {/* placeholder: só fica :valid após escolher algo */}
        <option value="" disabled hidden>Selecione...</option>
        {(options || []).map((opt, idx) => (
          <option key={optValueOf(opt) || idx} value={optValueOf(opt)}>
            {optLabelOf(opt)}
          </option>
        ))}
      </select>

      <label className="floating-label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
