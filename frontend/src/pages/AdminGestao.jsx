//frontend/src/pages/AdminGestao.jsx

import { useEffect, useMemo, useState } from "react";

const FN_BASE = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || "").replace(/\/$/, "");
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN || "";

async function adminCall(fn, payload) {
  const res = await fetch(`${FN_BASE}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN,
    },
    body: JSON.stringify(payload ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

function Badge({ children, color = "slate" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-${color}-100 text-${color}-700`}>
      {children}
    </span>
  );
}

export default function AdminGestao() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [ativo, setAtivo] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 50;
  const [toast, setToast] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const body = { page, perPage };
      if (q) body.q = q;
      if (role) body.role = role;
      if (ativo !== "") body.ativo = ativo === "true";
      const { rows } = await adminCall("admin-list-accounts", body);
      setRows(rows || []);
    } catch (e) {
      setToast({ ok: false, msg: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);
  const filteredCount = useMemo(() => rows.length, [rows]);

  async function toggleAtivo(email, value) {
    try {
      await adminCall("admin-set-access", { email, ativo: value });
      setRows((rs) => rs.map(r => r.email === email ? { ...r, ativo: value } : r));
      setToast({ ok: true, msg: value ? "Ativado" : "Desativado" });
    } catch (e) {
      setToast({ ok: false, msg: e.message });
    }
  }

  async function changeRole(email, newRole) {
    try {
      await adminCall("admin-set-access", { email, role: newRole });
      setRows((rs) => rs.map(r => r.email === email ? { ...r, role: newRole } : r));
      setToast({ ok: true, msg: `Role: ${newRole}` });
    } catch (e) {
      setToast({ ok: false, msg: e.message });
    }
  }

  async function sendReset(email) {
    try {
      await adminCall("admin-reset-password", {
        email,
        redirectTo: `${window.location.origin}/reset`,
      });
      setToast({ ok: true, msg: "Link de redefinição enviado." });
    } catch (e) {
      setToast({ ok: false, msg: e.message });
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-emerald-900">Gestão de contas</h1>
        <div className="flex gap-2">
          <a href="/admin" className="px-3 py-2 rounded-lg border">← Voltar</a>
          <button onClick={load} className="px-3 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60" disabled={loading}>
            Recarregar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="border rounded-xl px-3 py-2 md:col-span-2"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="border rounded-xl px-3 py-2">
          <option value="">Todos os perfis</option>
          <option value="admin">Admin</option>
          <option value="cliente">Cliente</option>
        </select>
        <select value={ativo} onChange={(e) => setAtivo(e.target.value)} className="border rounded-xl px-3 py-2">
          <option value="">Ativos e inativos</option>
          <option value="true">Apenas ativos</option>
          <option value="false">Apenas inativos</option>
        </select>
        <button onClick={() => { setPage(1); load(); }} className="md:col-span-4 justify-self-start px-3 py-2 rounded-xl border">
          Aplicar filtros
        </button>
      </div>

      <div className="rounded-2xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left px-3 py-2">E-mail</th>
              <th className="text-left px-3 py-2">Criado</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Ativo</th>
              <th className="text-left px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.nome || "-"}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <select
                    value={r.role || ""}
                    onChange={(e) => changeRole(r.email, e.target.value)}
                    className="border rounded-lg px-2 py-1"
                  >
                    <option value="">—</option>
                    <option value="admin">admin</option>
                    <option value="cliente">cliente</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!r.ativo}
                      onChange={(e) => toggleAtivo(r.email, e.target.checked)}
                    />
                    {r.ativo ? <Badge color="emerald">ativo</Badge> : <Badge color="red">inativo</Badge>}
                  </label>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => sendReset(r.email)} className="text-emerald-700 underline">
                    Resetar senha
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Sem resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="border rounded-lg px-3 py-1 disabled:opacity-50">Anterior</button>
        <span className="text-sm text-slate-600">Página {page} • {filteredCount} itens</span>
        <button onClick={() => setPage((p) => p + 1)} className="border rounded-lg px-3 py-1">Próxima</button>
      </div>

      {toast && (
        <div className={`fixed bottom-5 right-5 px-4 py-2 rounded-xl shadow ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
