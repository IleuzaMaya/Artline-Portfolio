//frontend/src/pages/AdminGestao.jsx
import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../lib/adminApi";
import { Link } from "react-router-dom";

export default function AdminGestao() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [ativo, setAtivo] = useState("");
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(1);

  const perPage = 50;

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const payload = {
        page,
        perPage,
        q: q || undefined,
        role: role || undefined,
        ativo: ativo === "" ? undefined : ativo === "true",
      };
      const data = await adminApi.listAccounts(payload);
      setRows(data.rows || []);
    } catch (e) {
      setMsg(String(e.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  const filteredInfo = useMemo(() => {
    let f = rows;
    if (role) f = f.filter(r => String(r.role || "") === role);
    if (ativo !== "") f = f.filter(r => String(r.ativo) === ativo);
    if (q) {
      const qq = q.toLowerCase();
      f = f.filter(r =>
        String(r.email || "").toLowerCase().includes(qq) ||
        String(r.nome || "").toLowerCase().includes(qq)
      );
    }
    return f;
  }, [rows, q, role, ativo]);

  async function toggleAtivo(email, valor) {
    setMsg("");
    try {
      await adminApi.setAccess({ email, ativo: valor });
      await load();
      setMsg("Acesso atualizado.");
    } catch (e) {
      setMsg(String(e.message ?? e));
    }
  }

  async function changeRole(email, newRole) {
    setMsg("");
    try {
      await adminApi.setAccess({ email, role: newRole });
      await load();
      setMsg("Função atualizada.");
    } catch (e) {
      setMsg(String(e.message ?? e));
    }
  }

  async function sendReset(email) {
    setMsg("");
    try {
      await adminApi.resetPassword({
        email,
        redirectTo: `${window.location.origin}/reset`,
      });
      setMsg("E-mail de redefinição enviado.");
    } catch (e) {
      setMsg(String(e.message ?? e));
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold text-emerald-900">Gestão de contas</h1>
        <Link to="/admin" className="ml-auto rounded-xl border px-4 py-2">Voltar</Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          className="rounded-xl border px-4 py-2"
          placeholder="Buscar por e-mail ou nome"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-xl border px-3 py-2"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Todas as funções</option>
          <option value="admin">admin</option>
          <option value="cliente">cliente</option>
        </select>
        <select
          className="rounded-xl border px-3 py-2"
          value={ativo}
          onChange={(e) => setAtivo(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <button
          onClick={() => { setPage(1); load(); }}
          className="rounded-xl bg-emerald-700 text-white px-4 py-2 disabled:opacity-50"
          disabled={loading}
        >
          Atualizar
        </button>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-3 ${msg.includes("atualizada") || msg.includes("enviado") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {msg}
        </div>
      )}

      <div className="overflow-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Função</th>
              <th className="text-left p-3">Ativo</th>
              <th className="text-left p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="p-4" colSpan={5}>Carregando…</td></tr>
            )}
            {!loading && filteredInfo.length === 0 && (
              <tr><td className="p-4" colSpan={5}>Sem resultados</td></tr>
            )}
            {!loading && filteredInfo.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.email}</td>
                <td className="p-3">{r.nome || "-"}</td>
                <td className="p-3">
                  <select
                    className="rounded-md border px-2 py-1"
                    value={r.role || ""}
                    onChange={(e) => changeRole(r.email, e.target.value)}
                  >
                    <option value="">-</option>
                    <option value="admin">admin</option>
                    <option value="cliente">cliente</option>
                  </select>
                </td>
                <td className="p-3">
                  <button
                    className={`rounded-md px-3 py-1 ${r.ativo ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}
                    onClick={() => toggleAtivo(r.email, !r.ativo)}
                  >
                    {r.ativo ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="p-3">
                  <button
                    className="rounded-md border px-3 py-1"
                    onClick={() => sendReset(r.email)}
                  >
                    Enviar reset
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          className="rounded-md border px-3 py-1 disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          ◀ Página anterior
        </button>
        <span className="text-sm">Página {page}</span>
        <button
          className="rounded-md border px-3 py-1"
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima página ▶
        </button>
      </div>
    </div>
  );
}
