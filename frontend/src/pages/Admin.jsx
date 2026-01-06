// frontend/src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { adminApi } from "../lib/adminApi";


const PRIMARY_SYSTEM_EMAIL = "artemoldurados@gmail.com";
const SUPER_ADMINS = new Set([
  "artemoldurados@gmail.com",
  "ileuza.maya@gmail.com",
  "michelle.mayaa@gmail.com",
]);


function normEmail(s) { return String(s || "").trim().toLowerCase(); }

function canEditProfile(callerEmail, target) {
  const caller = normEmail(callerEmail);
  if (!caller) return false;

  const isSuper = SUPER_ADMINS.has(caller);
  if (isSuper) return true; // super-admin edita todos (clientes e admins)

  // admin comum: pode editar a si mesmo e clientes
  const targetEmail = normEmail(target?.email);
  if (!targetEmail) return false;

  if (caller === targetEmail) return true;             // próprios dados
  if (target?.role === "cliente") return true;         // dados de clientes

  return false; // não edita admins
}


function canEditAccess(callerEmail, target) {
  const caller = normEmail(callerEmail);
  const targetEmail = normEmail(target.email);

  if (!caller || !targetEmail) return false;
  if (caller === targetEmail) return false; // ninguém mexe em si mesmo

  const isSuper = SUPER_ADMINS.has(caller);
  const isPrimarySystem = caller === PRIMARY_SYSTEM_EMAIL;
  const canManageAdmins = isSuper || isPrimarySystem;

  // não mexe na conta principal
  if (targetEmail === PRIMARY_SYSTEM_EMAIL) return false;

  // proteger super-admins
  if (SUPER_ADMINS.has(targetEmail) && !isSuper) return false;

  // admin comum não edita admin
  if (target.role === "admin" && !canManageAdmins) return false;

  return true;
}


function formatPhone(value) {
  const digits = (value || "").replace(/\D/g, "");

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    // até 10 dígitos -> (11) 1234-5678
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  // 11 dígitos -> (11) 91234-5678
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
      <div style={{ color: "#667085", fontWeight: 600 }}>{label}</div>
      <div style={{ color: "#101828" }}>{value}</div>
    </div>
  );
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
  const [primaryAdminEmail, setPrimaryAdminEmail] =
    useState("artemoldurados@gmail.com");

  // Form "Criar/Convidar cliente"
  const [formName, setFormName] = useState("");
  const [formEmpresa, setFormEmpresa] = useState("Artemoldurados");
  const [formRole, setFormRole] = useState("cliente"); // "cliente" | "admin"
  const [formEmail, setFormEmail] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formSenha, setFormSenha] = useState("");

  // Troca de senha do usuário logado
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePassError, setChangePassError] = useState("");

  // Visualiza senha:
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form de edição
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
  id: "",
  nome: "",
  email: "",
  telefone: "",
  empresa: "",
  role: "cliente",
  ativo: true,

  // controle de email
  email_original: "",
  __canEmail: false,

  // permissões
  __canProfile: false,
  __canAccess: false,
});

const [savingEdit, setSavingEdit] = useState(false);
const [editError, setEditError] = useState(""); 

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
      const data = await adminApi.listAccounts();
      const list = Array.isArray(data?.accounts) ? data.accounts : [];
      setAccounts(list);

      console.log("ACCOUNTS DO BACKEND:", list);

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

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsAcc, setDetailsAcc] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const detailsCloseBtnRef = React.useRef(null);
  const lastFocusRef = React.useRef(null);

  useEffect(() => {
    (async () => {
      setLoadingPage(true);
      await loadSession();
      await loadAccounts();
      setLoadingPage(false);
    })();
  }, []);

  useEffect(() => {
    if (!detailsOpen) return;

    // trava scroll do fundo
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // foca no botão Fechar quando abrir
    setTimeout(() => {
      detailsCloseBtnRef.current?.focus?.();
    }, 0);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDetails();
        return;
      }

      // "focus trap" simples (Tab / Shift+Tab)
      if (e.key === "Tab") {
        const root = document.getElementById("details-modal-root");
        if (!root) return;

        const focusables = root.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const list = Array.from(focusables).filter(
          (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
        );

        if (list.length === 0) return;

        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          // Shift+Tab
          if (active === first || !root.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow; // destrava scroll
    };
  }, [detailsOpen]); // ok assim


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

  function openDetails(acc) {
    lastFocusRef.current = document.activeElement; // guarda quem estava com foco
    setDetailsAcc(acc);
    setDetailsOpen(true);

    requestAnimationFrame(() => setDetailsVisible(true)); // anima abrir
  }

  function closeDetails() {
    setDetailsVisible(false);
    setTimeout(() => {
      setDetailsOpen(false);
      setDetailsAcc(null);

      // devolve foco pra onde estava (ex: botão Detalhes)
      if (lastFocusRef.current && typeof lastFocusRef.current.focus === "function") {
        lastFocusRef.current.focus();
      }
    }, 180);
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
        role: formRole === "admin" ? "admin" : "cliente",
        password: (formSenha || "").trim(),
      };

      if (!payload.email) throw new Error("E-mail é obrigatório.");

      await adminApi.createClient(payload);
      await loadAccounts();
      resetCreateForm();
      alert("Usuário criado/enviado com sucesso!");
    } catch (err) {
      if (err?.status === 409 && err?.payload?.code === "EMAIL_ALREADY_EXISTS") {


        setSubmitError(`E-mail já cadastrado: ${err.payload.email}`);
      } else if (err?.status === 409 && err?.payload?.code === "ACCOUNT_DELETED") {
        setSubmitError(`Este e-mail já existiu e foi desativado/excluído: ${err.payload.email}`);
      } else {
        setSubmitError(err?.message || "Erro ao criar/enviar convite.");
      }
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
        ativo: !acc.ativo,
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

  async function handleChangePassword(e) {
    e.preventDefault();
    setChangePassError("");

    if (!newPassword.trim()) {
      setChangePassError("Informe a nova senha.");
      return;
    }
    if (newPassword.length < 6) {
      setChangePassError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePassError("A confirmação de senha não confere.");
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      alert("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setChangePassError(err.message || "Erro ao alterar senha.");
    } finally {
      setChangingPassword(false);
    }
  }

    function startEdit(acc) {
      setEditError("");

      const canProfile = canEditProfile(currentEmail, acc);
      const canAccess = canEditAccess(currentEmail, acc);

      if (!canProfile && !canAccess) {
        alert("Você não tem permissão para editar este usuário.");
        return;
      }

      if (!isUuid(acc?.id)) {
        alert("Este registro está sem ID válido. Recarregue a página ou verifique o backend.");
        return;
      }

      const safeId = acc.id;
      const isSuper = SUPER_ADMINS.has(normEmail(currentEmail));

      setEditingId(safeId);
      setEditForm({
        id: safeId,
        nome: acc.nome || "",
        email: normEmail(acc.email),
        telefone: acc.telefone || "",
        empresa: acc.empresa || "",
        role: acc.role || "cliente",
        ativo: acc.ativo ?? true,

        email_original: normEmail(acc.email),
        __canEmail: isSuper,

        __canProfile: canProfile,
        __canAccess: canAccess,
      });
    }

    function cancelEdit() {
      setEditingId(null);
      setEditError("");
      setEditForm({
        id: "",
        nome: "",
        email: "",
        telefone: "",
        empresa: "",
        role: "cliente",
        ativo: true,

        email_original: "",
        __canEmail: false,

        __canProfile: false,
        __canAccess: false,
      });
    }

  function handleEditChange(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

    function isUuid(v) {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));
    }

      async function saveEdit() {
        setEditError("");

        try {
          setSavingEdit(true);

          const emailOld = normEmail(editForm.email_original);
          const emailNew = normEmail(editForm.email);
          const emailChanged = !!(emailOld && emailNew && emailOld !== emailNew);

          if (emailChanged) {
            if (!editForm.__canEmail) {
              setEditError("Você não tem permissão para alterar o e-mail.");
              return;
            }

            const ok = window.confirm(
              `Você vai alterar o e-mail de:\n${emailOld}\npara:\n${emailNew}\n\nConfirma?`
            );
            if (!ok) return;
          }

          const idSafe = isUuid(editForm.id) ? editForm.id : undefined;

          // 1) Dados humanos (só se puder)
          if (editForm.__canProfile) {
            await adminApi.updateClient({
              ...(idSafe ? { user_id: idSafe } : {}),

              // mantém compat, mas PASSA email_old e email_new (se mudou)
              email: emailOld, // referência do registro (fallback)
              ...(emailChanged ? { email_new: emailNew } : {}),
              actor_email: currentEmail,
              nome: (editForm.nome || "").trim(),
              empresa: (editForm.empresa || "").trim() || null,
              telefone: (editForm.telefone || "").trim() || null,
              
            });
          }

          // 2) Acesso (só se puder)
          if (editForm.__canAccess) {
            await adminApi.setAccess({
              email: emailChanged ? emailNew : emailOld, // <- importante
              role: editForm.role === "admin" ? "admin" : "cliente",
              ativo: !!editForm.ativo,
            });
          }

          await loadAccounts();
          cancelEdit();
        } catch (err) {
          console.error(err);

          // ✅ tratamento igual create
          if (err?.status === 409 && err?.payload?.code === "EMAIL_ALREADY_EXISTS") {
            setEditError(`E-mail já cadastrado: ${err.payload.email}`);
            return;
          }
          if (err?.status === 409 && err?.payload?.code === "ACCOUNT_DELETED") {
            setEditError(`Este e-mail já existiu e foi desativado/excluído: ${err.payload.email}`);
            return;
          }

          setEditError(err?.message || "Erro ao salvar alterações.");
        } finally {
          setSavingEdit(false);
        }
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
                onChange={(e) => setFormTelefone(formatPhone(e.target.value))}
              />
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                Senha (opcional)
              </label>
              <div className="relative">
                <input
                  type={showCreatePassword ? "text" : "password"}
                  className="h-10 w-full rounded-md border border-slate-200 px-3 pr-16 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Deixe vazio para enviar convite"
                  value={formSenha}
                  onChange={(e) => setFormSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center justify-center rounded-md px-2 text-slate-500 hover:text-slate-800"
                  aria-label={showCreatePassword ? "Ocultar senha" : "Mostrar senha"}
                  title={showCreatePassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showCreatePassword ? (
                    // eye-off
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M10.6 10.6A3 3 0 0013.4 13.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M9.9 5.3A10.7 10.7 0 0122 12c-.7 1.4-1.7 2.6-2.9 3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M6.2 6.2A10.8 10.8 0 002 12c2.1 4.1 6 7 10 7 1.4 0 2.7-.3 3.9-.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    // eye
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2 12c2.1-4.1 6-7 10-7s7.9 2.9 10 7c-2.1 4.1-6 7-10 7s-7.9-2.9-10-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
              </div>
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
                  <th className="px-3 py-2 font-medium w-56">Nome</th>
                  <th className="px-3 py-2 font-medium w-64">E-mail</th>
                  <th className="px-3 py-2 font-medium w-28">Status</th>
                  <th className="px-3 py-2 font-medium w-32">Perfil</th>
                  <th className="px-3 py-2 font-medium w-32 text-right">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {showingList.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-sm text-slate-500 text-center"
                    >
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}

                  const rowKey = acc.id;
                  const isEditing = editingId === rowKey;

                  return (
                    <React.Fragment key={rowKey}>
                      ...
                    </React.Fragment>
                  );
                })}


                  const rowKey = acc.id;    
                  const isEditing = editingId === rowKey;    

                  return (
                    <React.Fragment key={rowKey}>

                      {/* Linha principal */}
                      <tr className="hover:bg-slate-50 transition">
                        {/* Nome */}
                        <td className="px-4 py-3 text-sm text-slate-800">
                          {isEditing ? (
                            <input
                              type="text"
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                              value={editForm.nome}
                              disabled={!editForm.__canProfile}
                              onChange={(e) => handleEditChange("nome", e.target.value)}
                            />

                          ) : (
                            acc.nome || "—"
                          )}
                        </td>

                        {/* E-mail */}
                        <td className="px-4 py-3 text-sm text-slate-800">
                          {isEditing ? (
                            <input
                              type="email"
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                              value={editForm.email}
                              disabled={!editForm.__canEmail}
                              onChange={(e) => handleEditChange("email", e.target.value)}
                              title={editForm.__canEmail ? "Você pode corrigir o e-mail (super-admin)." : "E-mail não pode ser alterado."}
                            />
                          ) : (
                            acc.email
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={
                              (acc.ativo
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-700") +
                              " inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                            }
                          >
                            {acc.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>

                        {/* Perfil */}
                        <td className="px-4 py-3 text-sm text-slate-800">
                          {isEditing ? (
                            <select
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                              value={editForm.role}
                              disabled={!editForm.__canAccess}
                              onChange={(e) => handleEditChange("role", e.target.value)}
                            >
                              <option value="cliente">Cliente</option>
                              <option value="admin">Administrador</option>
                            </select>
                          ) : acc.role === "admin" ? (
                            "Administrador"
                          ) : (
                            "Cliente"
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3 text-sm">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                disabled={savingEdit}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={saveEdit}
                                className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                                disabled={savingEdit}
                              >
                                {savingEdit ? "Salvando..." : "Salvar"}
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openDetails(acc)}
                                className="inline-flex items-center rounded-md border border-emerald-600 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                              >
                                Detalhes
                              </button>

                              {(canEditProfile(currentEmail, acc) || canEditAccess(currentEmail, acc)) && (
                                <button
                                  type="button"
                                  onClick={() => startEdit(acc)}
                                  className="inline-flex items-center justify-center rounded-md border border-emerald-600 p-2 text-emerald-700 hover:bg-emerald-50"
                                  title="Editar"
                                  aria-label="Editar"
                                >
                                  {/* pencil */}
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path
                                      d="M12 20h9"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                    <path
                                      d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              )}

                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Linha extra com Empresa / Telefone / Ativo quando estiver editando */}
                      {isEditing && (
                        <tr className="bg-slate-50">
                          <td colSpan={5} className="px-4 pb-4 pt-2">
                            <div className="grid gap-3 md:grid-cols-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                  Empresa (opcional)
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                  value={editForm.empresa}
                                  disabled={!editForm.__canProfile}
                                  onChange={(e) => handleEditChange("empresa", e.target.value)}
                                />

                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                  Telefone (opcional)
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                  value={editForm.telefone}
                                  disabled={!editForm.__canProfile}
                                  onChange={(e) => handleEditChange("telefone", e.target.value)}
                                />

                              </div>
                              <div className="flex items-end">
                                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    checked={!!editForm.ativo}
                                    disabled={!editForm.__canAccess}
                                    onChange={(e) =>
                                      handleEditChange("ativo", e.target.checked)
                                    }
                                  />
                                  Ativo
                                </label>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {detailsOpen && detailsAcc && (
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
            )}
          </div>
        </div>

        {/* Card alterar senha do usuário logado */}
        {currentEmail && (
          <div className="mb-4 rounded-2xl bg-white shadow p-5 md:p-6">
            <h2 className="text-sm font-semibold text-slate-800">
              Alterar minha senha
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Você está logada como{" "}
              <span className="font-medium text-slate-700">
                {currentEmail}
              </span>
              . Use este formulário para trocar a sua senha de acesso.
            </p>

            <form
              onSubmit={handleChangePassword}
              className="mt-3 grid gap-3 md:grid-cols-2"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="h-10 w-full rounded-md border border-slate-200 px-3 pr-16 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 flex items-center text-xs text-slate-500 hover:text-slate-800"
                  >
                    {showNewPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="h-10 w-full rounded-md border border-slate-200 px-3 pr-16 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 flex items-center text-xs text-slate-500 hover:text-slate-800"
                  >
                    {showConfirmPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 mt-1">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {changingPassword ? "Salvando..." : "Alterar senha"}
                </button>

                {changePassError && (
                  <p className="mt-2 text-xs text-red-600">
                    {changePassError}
                  </p>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Card reset de senha por e-mail */}
        <div className="mb-4 rounded-2xl bg-white shadow p-5 md:p-6">
          <h2 className="text-sm font-semibold text-slate-800">
            Enviar link de redefinição
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Informe o e-mail para enviar ao cliente ou administrador o link de
            redefinição.
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
