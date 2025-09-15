//frontend/src/pages/AdminGestao.jsx
import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../lib/adminApi";

export default function AdminGestao() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [ativo, setAtivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setBusy(true); setMsg("");
    try {
      const params = { q };
      if (role) params.role = role;
      if (ativo !== "") params.ativo = ativo === "true";
      const data = await adminApi.listAccounts(params);
      setRows(data.rows || []);
    } catch (e) {
      setMsg(String(e.message ?? e));
    } finally { setBusy(false); }
  }

  useEffect(() => { load(); }, []); // primeira carga

  async function toggleAtivo(email, current) {
    setBusy(true); setMsg("");
    try {
      await adminApi.setAccess({ email, ativo: !current, role: (rows.find(r => r.email===email)?.role) || "cliente" });
      await load();
    } catch (e) {
      setMsg(String(e.message ?? e));
      setBusy(false);
    }
  }

  async function changeRole(email, newRole) {
    setBusy(true); setMsg("");
    try {
      await adminApi.setAccess({ email, role: newRole });
      await load();
    } catch (e) {
      setMsg(String(e.message ?? e));
      setBusy(false);
    }
  }

  const filtered = useMemo(() => rows, [rows]); // filtros já aplicados no backend

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Gestão de contas</h1>
        <div className="ml-auto flex gap-2">
          <input className="rounded border px-3 py-2" placeholder="Buscar..." value={q} onChange={(e)=>setQ(e.target.value)} />
          <select className="rounded border px-3 py-2" value={role} onChange={(e)=>setRole(e.target.value)}>
            <option value="">Role: todas</option>
            <option value="admin">admin</option>
            <option value="cliente">cliente</option>
          </select>
          <select className="rounded border px-3 py-2" value={ativo} onChange={(e)=>setAtivo(e.target.value)}>
            <option value="">Ativo: todos</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
          <button onClick={load} disabled={busy} className="rounded bg-emerald-700 text-white px-4 py-2 disabled:opacity-50">Atualizar</button>
        </div>
      </div>

      {msg && <div className="mb-4 rounded bg-red-50 px-4 py-3 text-red-800">{msg}</div>}

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">E-mail</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Ativo</th>
              <th className="px-3 py-2">Criado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.nome || "—"}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2 text-center">
                  <select
                    className="rounded border px-2 py-1"
                    value={r.role || "cliente"}
                    onChange={(e) => changeRole(r.email, e.target.value)}
                    disabled={busy}
                  >
                    <option value="admin">admin</option>
                    <option value="cliente">cliente</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => toggleAtivo(r.email, !!r.ativo)}
                    className={`rounded px-3 py-1 ${r.ativo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
                    disabled={busy}
                  >
                    {r.ativo ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="px-3 py-2 text-center">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Nenhum resultado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
