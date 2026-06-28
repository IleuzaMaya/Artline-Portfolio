function InfoRow({ label, value }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
      <div style={{ color: "#667085", fontWeight: 600 }}>{label}</div>
      <div style={{ color: "#101828" }}>{value}</div>
    </div>
  );
}

export default function AdminDetailsModal({
  detailsAcc,
  detailsVisible,
  closeDetails,
  detailsCloseBtnRef,
  formatPhone,
}) {
  if (!detailsAcc) return null;

  return (
    <div
      onClick={closeDetails}
      className={[
        "fixed inset-0 z-[9999] flex items-center justify-center p-4",
        "transition-opacity duration-200 ease-out",
        detailsVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      style={{ background: "rgba(0,0,0,.35)" }}
      aria-hidden="false"
    >
      <div
        id="details-modal-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-modal-title"
        aria-describedby="details-modal-desc"
        onClick={(e) => e.stopPropagation()}
        className={[
          "w-full max-w-[560px] rounded-2xl bg-white",
          "shadow-[0_12px_40px_rgba(0,0,0,.18)]",
          "transition-all duration-200 ease-out",
          detailsVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-1",
        ].join(" ")}
        style={{ padding: 18 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div id="details-modal-title" style={{ fontSize: 18, fontWeight: 700 }}>
              {detailsAcc.nome || "—"}
            </div>

            <div id="details-modal-desc" style={{ color: "#667085", marginTop: 2 }}>
              {detailsAcc.email}
            </div>
          </div>

          <button
            ref={detailsCloseBtnRef}
            type="button"
            onClick={closeDetails}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Fechar
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <InfoRow label="Empresa" value={detailsAcc.empresa || "—"} />
          <InfoRow
            label="Telefone"
            value={detailsAcc.telefone ? formatPhone(detailsAcc.telefone) : "—"}
          />
          <InfoRow
            label="Perfil"
            value={detailsAcc.role === "admin" ? "Administrador" : "Cliente"}
          />
          <InfoRow label="Status" value={detailsAcc.ativo ? "Ativo" : "Inativo"} />
        </div>
      </div>
    </div>
  );
}