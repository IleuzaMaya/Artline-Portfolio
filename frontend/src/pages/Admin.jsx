// frontend/src/pages/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { adminApi } from "../lib/adminApi";
import { useToast } from "../ui/toast.jsx";

/* ===================== Helpers ===================== */
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
function formatPhoneBR(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

async function callFunction(path, payload) {
  // 1) tenta via adminApi (proxy opcional)
  if (adminApi && typeof adminApi === "function") {
    const r = await adminApi(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": import.meta.env.VITE_ADMIN_API_TOKEN,
      },
      body: JSON.stringify(payload),
    });
    return r.json ? r.json() : r;
  }
  // 2) fallback direto para Functions URL
  const base = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || "").replace(/\/$/, "");
  const url = `${base}/${path.replace(/^\//, "")}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": import.meta.env.VITE_ADMIN_API_TOKEN || "",
    },
    body: JSON.stringify(payload || {}),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data?.error || data?.message || `Erro HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return data;
}

/* ===================== Hook: carregar acessos por role ===================== */
function useAcessos(role) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchRows() {
    setLoading(true);
    const { data, error } = await supabase
      .from("acessos_permitidos")
      .select("email, role, ativo, is_deleted, is_primary_admin, deleted_at")
      .eq("role", role)
      .order("email", { ascending: true });
    if (!error) setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchRows();
  }, [role]);

  return { rows, loading, refresh: fetchRows };
}

/* ===================== Ações por linha ===================== */
function RowActions({ row, meEmail, onRefresh, show }) {
  const email = row.email?.toLowerCase();
  const me = meEmail?.toLowerCase();

  const isMe = email === me;
  const isPrimaryAdmin = row.is_primary_admin === true;

  // --- SOFT DELETE RULES ---
  const canSoftDelete =
    !row.is_deleted &&
    !isMe && // nunca desativa a si mesma
    !isPrimaryAdmin; // nunca desativa o admin principal

  // --- REACTIVATE RULES ---
  const canReactivate = row.is_deleted;

  // --- RESET PASSWORD RULES ---
  // só o próprio usuário logado pode resetar a própria senha
  const canResetPassword = isMe;

  async function softDelete() {
    const ok = confirm(`Desativar ${row.email}? (pode ser reativado depois)`);
    if (!ok) return;

    const { error } = await supabase
      .from("acessos_permitidos")
      .update({
        is_deleted: true,
        ativo: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("email", row.email);

    if (error) {
      show({ type: "error", message: error.message });
    } else {
      show({ type: "success", message: "Usuário desativado." });
      onRefresh();
    }
  }

  async function reactivate() {
    const { error } = await supabase
      .from("acessos_permitidos")
      .update({
        is_deleted: false,
        ativo: true,
        deleted_at: null,
      })
      .eq("email", row.email);

    if (error) {
      show({ type: "error", message: error.message });
    } else {
      show({ type: "success", message: "Usuário reativado." });
      onRefresh();
    }
  }

  async function resetPassword() {
    try {
      const r = await adminApi("admin-reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": import.meta.env.VITE_ADMIN_API_TOKEN,
        },
        body: JSON.stringify({ email: row.email }),
      });
      const res = r.json ? await r.json() : r;
      if (res?.error) throw new Error(res.error);
      show({ type: "success", message: "Link de redefinição enviado." });
    } catch (e) {
      show({ type: "error", message: e.message });
    }
  }

  return (
    <div className="flex gap-3 text-sm">
      {canSoftDelete && (
        <button
          className="hover:text-red-600 hover:underline transition"
          onClick={softDelete}
        >
          Desativar
        </button>
      )}

      {canReactivate && (
        <button
          className="hover:text-emerald-700 hover:underline transition"
          onClick={reactivate}
        >
          Reativar
        </button>
      )}

      {canResetPassword && (
        <button
          className="hover:text-emerald-600 hover:underline transition"
          onClick={resetPassword}
          title="Enviar link de redefinição para este usuário"
        >
          Reset senha
        </button>
      )}
    </div>
  );
}

/* ===================== Grid ===================== */
function Grid({ rows, meEmail, refresh, show }) {
  if (!rows?.length) return <div className="text-sm text-slate-500">Sem registros.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="px-3 py-2">E-mail</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Perfil</th>
            <th className="px-3 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.email} className="border-t">
              <td className="px-3 py-2 font-medium">{r.email}</td>
              <td className="px-3 py-2">
                {r.is_deleted ? "Desativado" : r.ativo ? "Ativo" : "Inativo"}
                {r.is_primary_admin && " · Admin principal"}
                {r.email?.toLowerCase() === meEmail?.toLowerCase() && " · Você"}
              </td>
              <td className="px-3 py-2">{r.role}</td>
              <td className="px-3 py-2">
                <RowActions
                  row={r}
                  meEmail={meEmail}
                  onRefresh={refresh}
                  show={show}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===================== Página ===================== */
export default function Admin() {
  const { show } = useToast();

  useEffect(() => {
    document.title = "Artemoldurados — Administração";
  }, []);

  const [meEmail, setMeEmail] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMeEmail(data?.user?.email?.toLowerCase() || "");
    });
  }, []);

  // form criar/convite
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [senha, setSenha] = useState("");
  const [roleNovo, setRoleNovo] = useState("cliente"); // NOVO: tipo de acesso
  const [loadingCreate, setLoadingCreate] = useState(false);

  async function handleCreateClient(e) {
    e.preventDefault();
    if (!isEmail(email)) {
      show({ type: "error", message: "Informe um e-mail válido." });
      return;
    }
    setLoadingCreate(true);
    try {
      const payload = {
        email: email.trim(),
        name: (nome || "").trim(), 
        telefone: onlyDigits(telefone),
        empresa: (empresa || "").trim(),
        password: (senha || "").trim(), // se vazio, gera link de convite
        role: roleNovo,                 // ← cliente ou admin
      };

      const res = await callFunction("admin-create-client", payload);

      if (res?.outcome === "created") {
        show({ type: "success", message: "Usuário criado com senha definida." });
      } else if (res?.outcome === "invited") {
        show({ type: "success", message: "Convite gerado (link retornado pela API)." });
      } else if (res?.outcome === "recovery") {
        show({ type: "info", message: "Usuário já existia — link de recuperação gerado." });
      } else {
        show({ type: "success", message: "Operação concluída." });
      }

      if (res?.reactivated) {
        show({
          type: "success",
          message: "Usuário estava desativado e foi reativado.",
        });
      }

      // Limpa o formulário depois de criar
      setNome("");
      setEmail("");
      setTelefone("");
      setEmpresa("");
      setSenha("");
      setRoleNovo("cliente");

      // recarregar grids
      await Promise.all([refClientes(), refAdmins()]);
    } catch (err) {
      show({ type: "error", message: `Erro ao criar/convidar: ${err.message}` });
    } finally {
      setLoadingCreate(false);
    }
  }

  // reset por card
  const [emailReset, setEmailReset] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);

  async function handleSendReset(e) {
    e.preventDefault();
    if (!isEmail(emailReset)) {
      show({ type: "error", message: "Informe um e-mail válido para reset." });
      return;
    }
    setLoadingReset(true);
    try {
      await callFunction("admin-reset-password", { email: emailReset.trim() });
      show({ type: "success", message: "Link de redefinição enviado por e-mail." });
      setEmailReset("");
    } catch (err) {
      show({ type: "error", message: `Erro ao enviar link: ${err.message}` });
    } finally {
      setLoadingReset(false);
    }
  }

  const telefoneMask = useMemo(
    () => (telefone ? formatPhoneBR(telefone) : ""),
    [telefone]
  );

  // tabs + dados
  const [tab, setTab] = useState("clientes");
  const { rows: clientes, refresh: refClientes } = useAcessos("cliente");
  const { rows: admins, refresh: refAdmins } = useAcessos("admin");

  return (
    <>
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-emerald-800">Administração</h1>
          <div className="text-sm text-slate-600">
            <Link to="/orcamento" className="underline hover:text-emerald-700">
              Ir para o Orçamento
            </Link>
          </div>
        </div>

        {/* Card: Criar/Convidar */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-lg font-medium text-slate-800">Criar/Convidar cliente</h2>
          <p className="text-sm text-slate-500 mb-4">
            Se <strong>senha</strong> ficar em branco, será gerado um <em>link de convite</em>.
          </p>

          <form
            onSubmit={handleCreateClient}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-sm text-slate-600">Nome</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600">Empresa (opcional)</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Empresa do cliente"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600">Tipo de acesso</label>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-white"
                value={roleNovo}
                onChange={(e) => setRoleNovo(e.target.value)}
              >
                <option value="cliente">Cliente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600">E-mail</label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@exemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600">Telefone (opcional)</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={telefoneMask}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 91234-5678"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600">Senha (opcional)</label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Deixe vazio para enviar convite"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={loadingCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 disabled:opacity-60"
              >
                {loadingCreate ? "Processando..." : "Criar / Enviar convite"}
              </button>
            </div>
          </form>
        </div>

        {/* Tabs + Grids */}
        <div className="bg-white rounded-2xl shadow p-5 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              className={`px-3 py-1.5 rounded ${
                tab === "clientes"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100"
              }`}
              onClick={() => setTab("clientes")}
            >
              Clientes
            </button>
            <button
              className={`px-3 py-1.5 rounded ${
                tab === "admins"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100"
              }`}
              onClick={() => setTab("admins")}
            >
              Administradores
            </button>
          </div>

          {tab === "clientes" && (
            <Grid
              rows={clientes}
              meEmail={meEmail}
              refresh={refClientes}
              show={show}
            />
          )}
          {tab === "admins" && (
            <Grid
              rows={admins}
              meEmail={meEmail}
              refresh={refAdmins}
              show={show}
            />
          )}
        </div>

        {/* Card: Reset isolado */}
        <div className="bg-white rounded-2xl shadow p-5 mt-6">
          <h2 className="text-lg font-medium text-slate-800">
            Enviar link de redefinição
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {emailReset ? (
              <>
                Enviar link para{" "}
                <span className="font-medium">
                  {emailReset.trim().toLowerCase()}
                </span>{" "}
                redefinir a senha.
              </>
            ) : (
              <>Informe o e-mail para enviar o link de redefinição.</>
            )}
          </p>

          <form
            onSubmit={handleSendReset}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600">
                {emailReset ? "Confirmar e-mail" : "E-mail do usuário"}
              </label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2"
                value={emailReset}
                onChange={(e) => setEmailReset(e.target.value)}
                placeholder="usuario@exemplo.com"
                required
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                disabled={loadingReset}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 disabled:opacity-60"
              >
                {loadingReset ? "Enviando..." : "Enviar link"}
              </button>
            </div>
          </form>
        </div>

        <div className="text-xs text-slate-500 mt-6">
          Logado como: <span className="font-medium">{meEmail || "—"}</span>
        </div>
      </div>
    </>
  );
}
