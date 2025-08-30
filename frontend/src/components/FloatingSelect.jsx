// frontend/src/components/FloatingSelect.jsx
export default function FloatingSelect({
  label,
  options = [],
  value,
  setValue,
  labelKey = "nome",
  valueKey = "id",
  size = "md",          // 👈 novo
  className = "",
  disabled = false,
}) {
  const S = size === "sm"
    ? { select: "h-9 text-sm px-3 py-2", label: "text-xs", gap: "mb-2" }
    : { select: "h-11 text-base px-4 py-3", label: "text-sm", gap: "mb-3" };

  return (
    <div className={`relative ${S.gap}`}>
      <select
        disabled={disabled}
        className={[
          "w-full rounded-lg border border-gray-300 bg-white outline-none",
          "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          S.select,
          className,
        ].join(" ")}
        value={value?.[valueKey] ?? ""}
        onChange={(e) => {
          const v = options.find(o => String(o[valueKey]) === e.target.value) || null;
          setValue?.(v);
        }}
      >
        <option value="" disabled>Selecione…</option>
        {options.map(o => (
          <option key={o[valueKey]} value={o[valueKey]}>
            {o[labelKey] ?? o[valueKey]}
          </option>
        ))}
      </select>
      {label && (
        <label className={[
          "pointer-events-none absolute -top-2 left-3 bg-white px-1 text-gray-600",
          S.label,
        ].join(" ")}>{label}</label>
      )}
    </div>
  );
}
