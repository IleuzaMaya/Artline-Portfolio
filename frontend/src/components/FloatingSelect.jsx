// frontend/src/components/FloatingSelect.jsx
export default function FloatingSelect({
  label,
  options = [],
  value,
  setValue,
  labelKey = "label",
  valueKey = "value",
  disabled = false,
  size = "sm",            // "sm" | "md"
  placeholder = "Selecione...",
  className = "",
  id,
}) {
  const sz = size === "sm"
    ? "h-9 text-sm px-3"
    : "h-11 text-base px-3";

  const _id = id || `fs-${label?.toString().replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={_id} className="block text-gray-600 text-xs mb-1">
          {label}
        </label>
      )}
      <select
        id={_id}
        className={`block w-full bg-white border rounded-lg ${sz} focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-10`}
        value={value?.[valueKey] ?? value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          const found = options.find(o => String(o?.[valueKey]) === v);
          setValue(found ?? v);
        }}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {(options || []).map((opt, i) => (
          <option key={opt?.[valueKey] ?? i} value={String(opt?.[valueKey])}>
            {opt?.[labelKey] ?? opt?.toString?.() ?? ""}
          </option>
        ))}
      </select>
    </div>
  );
}
