// frontend/src/pages/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { adminApi } from "../lib/adminApi";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Admin() {
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [globalError, setGlobalError] = useState("");

  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState("clients"); // "clients" | "admins"

  const [currentEmail, setCurrentEmail] = useState(null);
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState("artemoldurados@gmail.com");

  // Form "Criar/Convidar cliente"
  const [formName, setFormName] = useState("");
  const [formEmpresa, setFormEmpresa] = useState("Artemoldurados");
  const [formRole, setFormRole] = useState("cliente"); // "cliente" | "admin"
  const [formEmail, setFormEmail] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formSenha, setFormSenha] = useState("");

  // Form "Enviar link de redefinição"
  const [resetEmail, setResetEmail] = useState("");

  async function loadSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error(error);
      setGlobalError("Não foi possível carregar a sessão.");
      return;
    }
    const email = data?.session?.user?.email ?? null;
    setCurrentEmail(email);
  }

  async function loadAccounts() {
    try {
      setGlobalError("");
      const data = await adminApi.listAccounts({});
      const list = Array.isArray(data?.accounts) ? data.accounts : [];
      setAccounts(list);

      // tenta descobrir o admin principal pela flag, se vier do backend
      const primary = list.find((acc) => acc.is_primary_admin);
      if (primary?.email) {
        setPrimaryAdminEmail(primary.email);
      }
    } catch (err) {
      console.error(err);
      setGlobalError(err.message || "Erro ao carregar lista de acessos.");
    }
  }

  useEffect(() => {
    (async () => {
      setLoadingPage(true);
      await loadSession();
      await loadAccounts();
      setLoadingPage(false);
    })();
  }, []);

  const admins = useMemo(
    () => accounts.filter((acc) => acc.role === "admin"),
    [accounts]
  );

  const clients = useMemo(
    () => accounts.filter((acc) => acc.role === "cliente"),
    [accounts]
  );

  function resetCreateForm() {
    setFormName("");
    setFormEmpresa("Artemoldurados");
    setFormRole("cliente");
    setFormEmail("");
    setFormTelefone("");
    setFormSenha("");
    setSubmitError("");
  }

  async function handleCreateClient(e) {
    e.preventDefault();
    setSubmitError("");
    setLoadingSubmit(true);

    try {
      const payload = {
        name: (formName || "").trim(),
        email: (formEmail || "").trim().toLowerCase(),
        empresa: (formEmpresa || "").trim(),
        telefone: (formTelefone || "").trim(),
        // ⭐ AQUI ESTÁ A CORREÇÃO IMPORTANTE:
        // sempre mandar apenas "admin" ou "cliente"
        role: formRole === "admin" ? "admin" : "cliente",
        password: (formSenha || "").trim(),
      };

      if (!payload.email) {
        throw new Error("E-mail é obrigatório.");
      }

      await adminApi.createClient(payload);
      await loadAccounts();
      resetCreateForm();
      alert("Usuário criado/enviado com sucesso!");
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || "Erro ao criar/enviar convite.");
    } finally {
      setLoadingSubmit(false);
    }
  }

  async function handleToggleActive(acc) {
    if (!acc?.email) return;
    const isMe = currentEmail && acc.email === currentEmail;
    const isPrimary = acc.email === primaryAdminEmail || acc.is_primary_admin;

    // segurança extra no frontend
    if (isMe || isPrimary) {
      alert("Você não pode desativar este usuário.");
      return;
    }

    const confirmMsg = acc.ativo
      ? `Desativar o acesso de ${acc.email}?`
      : `Reativar o acesso de ${acc.email}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminApi.setAccess({
        email: acc.email,
        ativo: !acc.ativo, // se quiser sempre desativar, troque para: false
      });
      await loadAccounts();
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao atualizar acesso.");
    }
  }

  async function handleRowResetPassword(acc) {
    if (!acc?.email) return;
    if (!currentEmail || acc.email !== currentEmail) {
      alert("Você só pode resetar a sua própria senha.");
      return;
    }

    if (
      !window.confirm(
        "Um link de redefinição de senha será enviado para o seu e-mail. Deseja continuar?"
      )
    ) {
      return;
    }

    try {
      setLoadingReset(true);
      await adminApi.resetPassword({ email: acc.email });
      alert("Link de redefinição enviado para o seu e-mail.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao enviar link de redefinição.");
    } finally {
      setLoadingReset(false);
    }
  }

  async function handleSendResetLink(e) {
    e.preventDefault();
    if (!resetEmail.trim()) {
      alert("Informe o e-mail do usuário.");
      return;
    }

    try {
      setLoadingReset(true);
      await adminApi.resetPassword({ email: resetEmail.trim().toLowerCase() });
      alert("Link de redefinição enviado (se o usuário existir e tiver acesso).");
      setResetEmail("");
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao enviar link de redefinição.");
    } finally {
      setLoadingReset(false);
    }
  }

  function renderStatus(acc) {
    const parts = [];
    parts.push(acc.ativo ? "Ativo" : "Inativo");

    const isPrimary = acc.email === primaryAdminEmail || acc.is_primary_admin;
    if (isPrimary && acc.role === "admin") {
      parts.push("Admin principal");
    }

    if (currentEmail && acc.email === currentEmail) {
      parts.push("Você");
    }

    return parts.join(" · ");
  }

  function renderActions(acc) {
    const isMe = currentEmail && acc.email === currentEmail;
    const isPrimary = acc.email === primaryAdminEmail || acc.is_primary_admin;

    const canShowDeactivate = !isMe && !isPrimary;
    const canShowReset = isMe; // ⭐ só o usuário logado vê "Reset senha" na sua linha

    if (!canShowDeactivate && !canShowReset) return null;

    return (
      <div className="flex items-center gap-3 text-sm">
        {canShowDeactivate && (
          <button
            type="button"
            onClick={() => handleToggleActive(acc)}
            className="text-gray-600 hover:text-red-600 hover:underline"
          >
            {acc.ativo ? "Desativar" : "Reativar"}
          </button>
        )}

        {canShowReset && (
          <button
            type="button"
            onClick={() => handleRowResetPassword(acc)}
            className="text-gray-600 hover:text-emerald-600 hover:underline"
            disabled={loadingReset}
          >
            {loadingReset ? "Enviando..." : "Reset senha"}
          </button>
        )}
      </div>
    );
  }

  const showingList = activeTab === "admins" ? admins : clients;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-emerald-800">
            Administração
          </h1>

          <Link
            to="/orcamento"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            Ir para o Orçamento
          </Link>
        </div>

        {globalError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        {/* Card superior - Criar/Convidar cliente */}
        <div className="mb-6 rounded-2xl bg-white shadow p-5 md:p-6">
          <h2 className="text-base font-semibold text-slate-800">
            Criar/Convidar cliente
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Se <span className="font-semibold">senha</span> ficar em branco, será
            gerado um <span className="font-semibold">link de convite</span>.
          </p>

          <form
            onSubmit={handleCreateClient}
            className="mt-4 grid gap-4 md:grid-cols-3"
          >
            {/* Nome */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Nome</label>
              <input
                type="text"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Nome do cliente"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Empresa */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                Empresa (opcional)
              </label>
              <input
                type="text"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Empresa do cliente"
                value={formEmpresa}
                onChange={(e) => setFormEmpresa(e.target.value)}
              />
            </div>

            {/* Tipo de acesso */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                Tipo de acesso
              </label>
              <select
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
              >
                <option value="cliente">Cliente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* E-mail */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                E-mail
              </label>
              <input
                type="email"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="cliente@exemplo.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            {/* Telefone */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                Telefone (opcional)
              </label>
              <input
                type="tel"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="(11) 91234-5678"
                value={formTelefone}
                onChange={(e) => setFormTelefone(e.target.value)}
              />
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                Senha (opcional)
              </label>
              <input
                type="password"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Deixe vazio para enviar convite"
                value={formSenha}
                onChange={(e) => setFormSenha(e.target.value)}
              />
            </div>

            {/* Botão */}
            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={loadingSubmit}
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loadingSubmit ? "Enviando..." : "Criar / Enviar convite"}
              </button>
            </div>
          </form>

          {submitError && (
            <p className="mt-2 text-sm text-red-600">{submitError}</p>
          )}
        </div>

        {/* Card lista de acessos */}
        <div className="mb-6 rounded-2xl bg-white shadow p-5 md:p-6">
          {/* Tabs */}
          <div className="mb-4 inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("clients")}
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
              onClick={() => setActiveTab("admins")}
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

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="px-3 py-2 font-medium">E-mail</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Perfil</th>
                  <th className="px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingPage ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-sm text-slate-500"
                    >
                      Carregando...
                    </td>
                  </tr>
                ) : showingList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-sm text-slate-500"
                    >
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  showingList.map((acc) => (
                    <tr
                      key={acc.email}
                      className="border-t border-slate-100 text-sm text-slate-800"
                    >
                      <td className="px-3 py-2 align-middle">
                        <span className="font-medium">{acc.email}</span>
                      </td>
                      <td className="px-3 py-2 align-middle text-slate-600">
                        {renderStatus(acc)}
                      </td>
                      <td className="px-3 py-2 align-middle text-slate-600">
                        {acc.role}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {renderActions(acc)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card reset de senha por e-mail */}
        <div className="mb-4 rounded-2xl bg-white shadow p-5 md:p-6">
          <h2 className="text-sm font-semibold text-slate-800">
            Enviar link de redefinição
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Informe o e-mail para enviar o link de redefinição.
          </p>

          <form
            onSubmit={handleSendResetLink}
            className="mt-3 flex flex-col gap-3 md:flex-row"
          >
            <div className="flex-1">
              <input
                type="email"
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="usuario@exemplo.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loadingReset}
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingReset ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Logado como:{" "}
          <span className="font-medium text-slate-700">
            {currentEmail || "—"}
          </span>
        </p>
      </div>
    </div>
  );
}
