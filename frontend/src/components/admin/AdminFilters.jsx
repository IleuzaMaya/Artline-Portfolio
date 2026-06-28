// frontend/src/components/admin/AdminFilters.jsx

export default function AdminFilters({
  activeTab,
  onTabChange,
  classNames,
}) {
  return (
    <div className="mb-4 inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={() => onTabChange("clients")}
        className={classNames(
          "rounded px-3 py-1.5 text-xs font-medium",
          activeTab === "clients"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-800"
        )}
      >
        Clientes
      </button>

      <button
        type="button"
        onClick={() => onTabChange("admins")}
        className={classNames(
          "rounded px-3 py-1.5 text-xs font-medium",
          activeTab === "admins"
            ? "bg-emerald-600 text-white shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        Administradores
      </button>
    </div>
  );
}

