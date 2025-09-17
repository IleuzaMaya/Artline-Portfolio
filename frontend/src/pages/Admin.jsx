// frontend/src/pages/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../lib/adminApi";
import { useToast } from "../ui/toast.jsx";
import { supabase } from "../lib/supabase";

// helpers de telefone
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
function formatPhoneBR(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2)  return d;
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return                 `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

// valida e-mail simples
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());

export default function Admin() {
  const { show } = useToast();

  // quem está logado (para limitar "Definir minha senha")
  const [myId, setMyId] = useState(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data?.user?.id || null));
  }, []);

  // --- estado: criação/convite ---
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busyCreate, setBusyCreate] = useState(false);
  const [msgCreate, setMsgCreate] = useState("");

  const canCreate = useMemo(
    () => emailOk(email) && name.trim().length >= 2 && !busyCreate,
    [email, name, busyCreate]
  );
  const canResetCreate = useMemo(() => emailOk(email) && !busyCreate, [email, busyCreate]);

  async function handleCreate() {
    if (!canCreate) return;
    setMsgCreate("");
    setBusyCreate(true);
    try {
      const e = email.trim().toLowerCase();
      const n = name.trim();
      const p = String(password || "");
      if (p && p.length < 8) throw new Error("Senha precisa ter 8+ caracteres");

      const res = await adminApi.createClient({ email: e, name: n, password: p });
      if (res.action_link) {
        show("Convite gerado", { href: res.action_link, copy: res.action_link, duration: 10000 });
      } else {
        setMsgCreate("Convite enviado / usuário criado.");
      }
      setEmail(""); setName(""); setPassword("");
    } catch (e) {
      setMsgCreate(String(e.message ?? e));
    } finally {
      setBusyCreate(false);
    }
  }

  async function handleSendResetCreate() {
    if (!canResetCreate) return;
    setMsgCreate("");
    setBusyCreate(true);
    try {
      const e = email.trim().toLowerCase();
      await adminApi.resetPassword({ email: e, redirectTo: `${window.location.origin}/reset` });
      setMsgCreate("E-mail de redefinição enviado.");
    } catch (e) {
      setMsgCreate(String(e.message ?? e));
    } finally {
      setBusyCreate(false);
    }
  }

  // --- estado: listagem/gestão ---
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;

  // filtros locais (client-side)
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [ativo, setAtivo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const payload = { page, perPage, q: q || undefined, role: role || undefined, ativo: ativo === "" ? undefined : ativo === "true" };
      const data = await adminApi.listAccounts(payload);
      // adiciona campos editáveis (empresa/segmento/telefone/nome)
      const arr = (data.rows || []).map((r) => ({
        ...r,
        _edit: {
          nome:     r.nome     || "",
          empresa:  r.empresa  || "",
          segmento: r.segmento || "",
          telefone: formatPhoneBR(r.telefone || ""),
        },
        _dirty: false,
      }));

      setRows(arr);
    } catch (e) {
      show(String(e.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  const filtered = useMemo(() => {
    let f = rows;
    if (role) f = f.filter((r) => String(r.role || "") === role);
    if (ativo !== "") f = f.filter((r) => String(r.ativo) === ativo);
    if (q) {
      const qq = q.toLowerCase();
      f = f.filter((r) => String(r.email || "").toLowerCase().includes(qq) || String(r.nome || "").toLowerCase().includes(qq));
    }
    return f;
  }, [rows, q, role, ativo]);

  function setRowEdit(idOrEmail, field, value) {
    setRows((prev) =>
      prev.map((r) => {
        const key = r.id || r.email;
        if (key !== idOrEmail) return r;

        const nextVal = field === "telefone" ? formatPhoneBR(value) : value;
        const _edit = { ...r._edit, [field]: nextVal };
        const telDirty = onlyDigits(_edit.telefone) !== onlyDigits(r.telefone || "");
        const _dirty =
          _edit.nome     !== (r.nome     || "") ||
          _edit.empresa  !== (r.empresa  || "") ||
          _edit.segmento !== (r.segmento || "") ||
          telDirty;

        return { ...r, _edit, _dirty };
      })
    );
  }

  async function saveRow(r) {
    try {
      const payload = {
        id:       r.id,
        email:    r.email,
        nome:     r._edit.nome,
        empresa:  r._edit.empresa,
        segmento: r._edit.segmento,
        telefone: onlyDigits(r._edit.telefone),
      };
      await adminApi.updateClient(payload);
      show("Dados salvos");
      await load();
    } catch (e) {
      show(String(e.message ?? e));
    }
  }

  async function toggleAtivo(email, valor) {
    try {
      await adminApi.setAccess({ email, ativo: valor });
      await load();
      show("Acesso atualizado");
    } catch (e) {
      show(String(e.message ?? e));
    }
  }

  async function changeRole(email, newRole) {
    try {
      await adminApi.setAccess({ email, role: newRole });
      await load();
      show("Função atualizada");
    } catch (e) {
      show(String(e.message ?? e));
    }
  }

  async function sendReset(email) {
    try {
      await adminApi.resetPassword({ email, redirectTo: `${window.location.origin}/reset` });
      show("E-mail de redefinição enviado");
    } catch (e) {
      show(String(e.message ?? e));
    }
  }

  // Definir senha: apenas o usuário logado pode alterar a própria
  async function defineMyPassword(row) {
    if (!row?.id || row.id !== myId) return; // guard extra
    const pwd = window.prompt("Nova senha (mín. 8 caracteres):") || "";
    if (!pwd) return;
    if (pwd.length < 8) { show("A senha precisa ter 8+ caracteres"); return; }
    try {
      await adminApi.setPassword({ id: myId, password: pwd });
      show("Senha atualizada.");
    } catch (e) {
      show(String(e.message ?? e));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      {/* topo */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-emerald-900">Administração</h1>
        <Link to="/orcamento" className="ml-auto rounded-xl bg-emerald-700 text-white px-4 py-2">Ir para o Orçamento</Link>
      </div>

      {/* card: criar/convidar */}
      <div className="rounded-2xl border p-6">
        <h2 className="text-xl font-semibold mb-4">Criar/Convidar cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="rounded-xl border px-4 py-3" placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="rounded-xl border px-4 py-3" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="relative">
            <input className="w-full rounded-xl border px-4 py-3 pr-12" placeholder="Senha (opcional)" type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70" onClick={() => setShowPwd((v) => !v)} aria-label="Mostrar senha">👁</button>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button disabled={!canCreate || busyCreate} onClick={handleCreate} className="rounded-xl bg-emerald-700 text-white px-5 py-3 disabled:opacity-50">Criar/Convidar</button>
          <button disabled={!canResetCreate || busyCreate} onClick={handleSendResetCreate} className="rounded-xl border px-5 py-3 disabled:opacity-50">Enviar “Esqueci a senha”</button>
        </div>
        {msgCreate && (
          <div className={`mt-4 rounded-lg px-4 py-3 ${msgCreate.startsWith("Convite") || msgCreate.startsWith("E-mail") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{msgCreate}</div>
        )}
      </div>

      {/* card: gestão/lista */}
      <div className="rounded-2xl border p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">Gestão de contas</h2>
          <input className="rounded-xl border px-4 py-2 ml-auto" placeholder="Buscar por e-mail ou nome" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="rounded-xl border px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Todas as funções</option>
            <option value="admin">admin</option>
            <option value="cliente">cliente</option>
          </select>
          <select className="rounded-xl border px-3 py-2" value={ativo} onChange={(e) => setAtivo(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          <button onClick={() => { setPage(1); load(); }} className="rounded-xl bg-emerald-700 text-white px-4 py-2 disabled:opacity-50" disabled={loading}>Atualizar</button>
        </div>

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Empresa</th>
                <th className="text-left p-3">Segmento</th>
                <th className="text-left p-3">Telefone</th>
                <th className="text-left p-3">Função</th>
                <th className="text-left p-3">Ativo</th>
                <th className="text-left p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td className="p-4" colSpan={8}>Carregando…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td className="p-4" colSpan={8}>Sem resultados</td></tr>
              )}
              {!loading && filtered.map((r) => (
                <tr key={r.id || r.email} className="border-t align-top">
                  <td className="p-3 whitespace-nowrap">{r.email}</td>
                  <td className="p-2"><input className="w-full rounded-md border px-2 py-1" value={r._edit.nome} onChange={(e) => setRowEdit(r.id || r.email, "nome", e.target.value)} /></td>
                  <td className="p-2"><input className="w-full rounded-md border px-2 py-1" value={r._edit.empresa} onChange={(e) => setRowEdit(r.id || r.email, "empresa", e.target.value)} /></td>
                  <td className="p-2"><input className="w-full rounded-md border px-2 py-1" value={r._edit.segmento} onChange={(e) => setRowEdit(r.id || r.email, "segmento", e.target.value)} /></td>
                  <td className="p-2">
                    <input
                      className="w-full rounded-md border px-2 py-1"
                      value={r._edit.telefone}
                      onChange={(e) => setRowEdit(r.id || r.email, "telefone", e.target.value)}
                      inputMode="numeric"
                      autoComplete="tel"
                    />
                  </td>

                  <td className="p-3">
                    <select className="rounded-md border px-2 py-1" value={r.role || ""} onChange={(e) => changeRole(r.email, e.target.value)}>
                      <option value="">-</option>
                      <option value="admin">admin</option>
                      <option value="cliente">cliente</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <button className={`rounded-md px-3 py-1 ${r.ativo ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`} onClick={() => toggleAtivo(r.email, !r.ativo)} disabled={loading}>
                      {r.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="p-3 space-x-2 whitespace-nowrap">
                    <button className="rounded-md border px-3 py-1 disabled:opacity-50" onClick={() => saveRow(r)} disabled={loading || !r._dirty}>Salvar</button>
                    <button className="rounded-md border px-3 py-1" onClick={() => sendReset(r.email)} disabled={loading}>Enviar reset</button>
                    {r.id === myId && (
                      <button className="rounded-md border px-3 py-1" onClick={() => defineMyPassword(r)} disabled={loading} title="Alterar a minha própria senha">
                        Definir minha senha
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="rounded-md border px-3 py-1 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>◀ Página anterior</button>
          <span className="text-sm">Página {page}</span>
          <button className="rounded-md border px-3 py-1" onClick={() => setPage((p) => p + 1)}>Próxima página ▶</button>
          {/* (removido) botão solto de Definir senha */}
        </div>
      </div>
    </div>
  );
}
