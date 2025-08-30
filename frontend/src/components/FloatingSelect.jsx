// frontend/src/components/FloatingSelect.jsx
export default function FloatingSelect({
  label,
  options = [],
  value,
  setValue,
  labelKey = "nome",
  valueKey = "id",
  disabled = false,
  size = "md",
}) {
  const sz = size === "sm" ? "h-9 text-sm" : "h-11";

  return (
    <div className="relative z-0 overflow-visible"> {/* garante que nada seja clipado */}
      {/* LABEL não intercepta clique */}
      <label
        className="absolute -top-2 left-3 px-1 text-xs text-gray-500 bg-white pointer-events-none"
      >
        {label}
      </label>

      {/* SELECT acima do label e vizinhos */}
      <select
        className={`block w-full mt-3 bg-white border rounded-lg px-3 ${sz} relative z-10
                    focus:outline-none focus:ring-2 focus:ring-blue-500`}
        value={value?.[valueKey] ?? ""}
        onChange={(e) =>
          setValue(options.find(o => String(o[valueKey]) === e.target.value) || null)
        }
        disabled={disabled}
      >
        <option value="">Selecione...</option>
        {options.map(opt => (
          <option key={opt[valueKey]} value={opt[valueKey]}>
            {opt[labelKey]}
          </option>
        ))}
      </select>
    </div>
  );
}
