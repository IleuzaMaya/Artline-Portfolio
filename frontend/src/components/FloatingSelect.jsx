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
    <div className="relative mb-3 overflow-visible">   {/* espaçamento + não clipa */}
      <label
        className="absolute -top-2 left-3 px-1 text-xs text-gray-500 bg-white pointer-events-none"
      >
        {label}
      </label>

      <select
        className={`block w-full mt-3 bg-white border rounded-lg px-3 ${sz} relative z-20
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
