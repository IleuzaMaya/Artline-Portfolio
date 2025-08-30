// frontend/src/components/FloatingInput.jsx
export default function FloatingInput({
  label,
  size = "md",          // 👈 novo
  className = "",
  ...props
}) {
  const S = size === "sm"
    ? { input: "h-9 text-sm px-3 py-2", label: "text-xs", gap: "mb-2" }
    : { input: "h-11 text-base px-4 py-3", label: "text-sm", gap: "mb-3" };

  return (
    <div className={`relative ${S.gap}`}>
      <input
        {...props}
        className={[
          "w-full rounded-lg border border-gray-300 outline-none",
          "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          S.input,
          className,
        ].join(" ")}
      />
      {label && (
        <label className={[
          "pointer-events-none absolute -top-2 left-3 bg-white px-1 text-gray-600",
          S.label,
        ].join(" ")}>{label}</label>
      )}
    </div>
  );
}
