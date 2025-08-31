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
  size = "md",
}) {
  const sz = size === "sm" ? "h-9 text-sm" : "h-11";

  return (
    <div className="relative mb-3 overflow-visible">
      <label
        className="absolute -top-2 left-3 px-1 text-xs text-gray-500 bg-white pointer-events-none"
      >
        {label}
      </label>

      <input
        className={`block w-full mt-3 bg-white border rounded-lg px-3 ${sz} relative z-20
                    focus:outline-none focus:ring-2 focus:ring-blue-500`}
        type={type}
        value={value}
        onChange={onChange}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
      />
    </div>
  );
}

