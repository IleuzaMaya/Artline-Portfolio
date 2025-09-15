import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN || "";

function Badge({ children, className = "" }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${className}`} />;
}

export default function AdminGestao() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [onlyAdmins, setOnlyAdmins] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-accounts", {
        body: {
          page: 1,
          perPage: 50,
          q: q || undefined,
          role: onlyAdmins ? "admin" : undefined,
          ativo: onlyActive ? true : undefined,
        },
        headers: { "x-admin-token": ADMIN_TOKEN },
      });
      if (error) throw new Error(error.message || JSON.stringify(error));
      setRows(data?.rows || []);
    } catch (e) {
      setToast({ ok: false, msg: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => rows, [rows]);

  async function toggleAtivo(email, value) {
    try {
      const { error } = await supabase.functions.invoke("admin-set-access", {
        body: { email, ativo: value },
        headers: { "x-admin-token": ADMIN_TOKEN },
      });
      if (error) throw new Error(error.message || JSON.stringify(error));
      setRows((rs) => rs.map(r => r.email === email ? { ...r, ativo: value } : r));
    } catch (e) {
      setToast({ ok: false, msg: e.message });
    }
  }

  async function changeRole(email, role) {
    try {
      const { error } = await supabase.functions.invoke("admin-set-access", {
        body: { email, role },
        headers: { "x-admin-token": ADMIN_TOKEN },
      });
      if (error) throw new Error(error.message || JSON.stringify(error));
      setRows((rs) => rs.map(r => r.email === email ? { ...r, role } : r));
    } catch (e) {
      setToast({ ok: false, msg: e.message });
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-emerald-900">Gestão de Contas</h1>
        <div className="flex gap-2">
          <a href="/admin" className="px-3 py-2 rounded-lg border">Voltar</a>
          <a href="/orcamento" className="px-3 py-2 rounded-lg bg-emerald-600 text-white">Ir para Orçamento</a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="border rounded-2xl px-3 py-2 w-64"
          placeholder="Buscar por e-mail ou nome"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
          Mostrar apenas ativos
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyAdmins} onChange={(e) => setOnlyAdmins(e.target.checked)} />
          Mostrar apenas admins
        </label>
        <button onClick={load} className="px-3 py-2 rounded-2xl bg-emerald-600 text-white disabled:opacity-60" disabled={loading}>
          {loading ? "Carregando..." : "Atualizar"}
        </button>
      </div>

      {toast && (
        <div className={`p-3 rounded ${toast.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {toast.msg}
        </div>
      )}

      <div className="overflow-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">E-mail</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Ativo</th>
              <th className="text-left p-3">Último acesso</th>
              <th className="text-left p-3">Empresa</th>
              <th className="text-left p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.nome || "—"}</td>
                <td className="p-3">{r.email}</td>
                <td className="p-3">
                  <select
                    className="border rounded px-2 py-1"
                    value={r.role || ""}
                    onChange={(e) => changeRole(r.email, e.target.value || null)}
                  >
                    <option value="">(sem)</option>
                    <option value="cliente">cliente</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="p-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={!!r.ativo} onChange={(e) => toggleAtivo(r.email, e.target.checked)} />
                    {r.ativo ? <span className="text-emerald-700">ativo</span> : <span className="text-slate-500">inativo</span>}
                  </label>
                </td>
                <td className="p-3">{r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString() : "—"}</td>
                <td className="p-3">{r.cliente?.empresa || "—"}</td>
                <td className="p-3">
                  <button
                    className="px-2 py-1 rounded border mr-2"
                    onClick={() => changeRole(r.email, "admin")}
                  >
                    Tornar admin
                  </button>
                  <button
                    className="px-2 py-1 rounded border"
                    onClick={() => changeRole(r.email, "cliente")}
                  >
                    Tornar cliente
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr><td className="p-4 text-slate-500" colSpan="7">Sem resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
