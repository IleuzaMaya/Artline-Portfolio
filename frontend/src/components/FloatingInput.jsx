// frontend/src/components/FloatingInput.jsx
export default function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  step,
  min,
  max,
  disabled = false,
  size = "sm",           // "sm" | "md"
  placeholder = "",
  id,
  className = "",
  variant = "top",       // "top" | "floating" (default = top)
}) {
  const sz = size === "sm" ? "h-9 text-sm px-3" : "h-11 text-base px-3";
  const _id = id || `fi-${(label || "input").toString().replace(/\s+/g, "-").toLowerCase()}`;

  if (variant === "floating") {
    return (
      <div className={`relative mb-3 overflow-visible ${className}`}>
        <label
          htmlFor={_id}
          className="absolute -top-2 left-3 px-1 text-xs text-gray-500 bg-white z-20 pointer-events-none"
        >
          {label}
        </label>
        <input
          id={_id}
          className={`block w-full bg-white border rounded-lg ${sz} focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-10`}
          type={type}
          value={value}
          onChange={onChange}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    );
  }

  // variant "top" (recomendado)
  return (
    <div className={`mb-3 ${className}`}>
      {label && <label htmlFor={_id} className="block text-gray-600 text-xs mb-1">{label}</label>}
      <input
        id={_id}
        className={`block w-full bg-white border rounded-lg ${sz} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        type={type}
        value={value}
        onChange={onChange}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
