// frontend/src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { adminApi } from "../lib/adminApi";
import { ENV } from "../config/env";
import { SYSTEM } from "../config/system";
import { normalizeEmail, isUuid } from "../utils/string";
import AdminToolbar from "../components/admin/AdminToolbar";
import AdminCreateUserForm from "../components/admin/AdminCreateUserForm";
import AdminFilters from "../components/admin/AdminFilters";
import AdminAccountsTable from "../components/admin/AdminAccountsTable";
import AdminDetailsModal from "../components/admin/AdminDetailsModal";

import {
  isPrimaryUser,
  isSuperAdmin,
} from "../config/permissions";


const PRIMARY_SYSTEM_EMAIL = SYSTEM.PRIMARY_SYSTEM_EMAIL;

// ID “real” (UUID) quando existir
function getAccId(acc) {
  return String(acc?.user_id || acc?.id || "").trim();
}

// Chave canônica da linha: usa UUID se tiver, senão email normalizado
function getRowKey(acc) {
  const accId = getAccId(acc);
  if (isUuid(accId)) return accId;

  const email = normalizeEmail(acc?.email);
  return email ? `email:${email}` : "";
}


function canEditProfile(callerEmail, target) {
  const caller = normalizeEmail(callerEmail);
  const targetEmail = normalizeEmail(target?.email);

  if (!caller || !targetEmail) return false;

  // 🔒 nunca editar a conta do sistema (nem super-admin)
  if (isPrimaryUser(targetEmail)) return false;

  const isSuper = isSuperAdmin(caller);
  if (isSuper) return true;

  if (caller === targetEmail) return true;
  if (target?.role === "cliente") return true;

  return false;
}



function canEditAccess(callerEmail, target) {
  const caller = normalizeEmail(callerEmail);
  const targetEmail = normalizeEmail(target.email);

  if (!caller || !targetEmail) return false;
  if (caller === targetEmail) return false; // ninguém mexe em si mesmo

  const isSuper = isSuperAdmin(caller);
  const isPrimarySystem = caller === PRIMARY_SYSTEM_EMAIL;


  const canManageAdmins = isSuper || isPrimarySystem;

  // não mexe na conta principal
  if (isPrimaryUser(targetEmail)) return false;

  // proteger super-admins
  if (isSuperAdmin(targetEmail) && !isSuper) return false;

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
    useState(SYSTEM.PRIMARY_SYSTEM_EMAIL);

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
  rowKey: "",
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
      await adminApi.resetPassword({
          email: acc.email,
          redirectTo: `${ENV.SITE_URL}/reset`,
      });
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
      await adminApi.resetPassword({
          email: resetEmail.trim().toLowerCase(),
          redirectTo: `${ENV.SITE_URL}/reset`,
      });
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

      // 🔒 blindagem extra: conta do sistema nunca edita
      if (normalizeEmail(acc?.email) === PRIMARY_SYSTEM_EMAIL) {
        alert("A conta do sistema não pode ser editada.");
        return;
      }

      const rowKey = getRowKey(acc);
      if (!rowKey) {
        alert("Este registro está sem ID/Email válido. Recarregue a página ou verifique o backend.");
        return;
      }

      const uid = getAccId(acc);
      const isSuper = isSuperAdmin(currentEmail);

      setEditingId(rowKey);
      setEditForm({
        rowKey,
        id: isUuid(uid) ? uid : "", // guarda UUID se existir
        nome: acc.nome || "",
        email: normalizeEmail(acc.email),
        telefone: acc.telefone || "",
        empresa: acc.empresa || "",
        role: acc.role || "cliente",
        ativo: acc.ativo ?? true,

        email_original: normalizeEmail(acc.email),
        __canEmail: isSuper,

        __canProfile: canProfile,
        __canAccess: canAccess,
      });
    }


    function cancelEdit() {
      setEditingId(null);
      setEditError("");
      setEditForm({
        rowKey: "",
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
    if (!savingEdit && editError) setEditError("");
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

      async function saveEdit() {
        setEditError("");

        try {
          setSavingEdit(true);

          const emailOld = normalizeEmail(editForm.email_original);
          const emailNew = normalizeEmail(editForm.email);
          const emailChanged = !!(emailOld && emailNew && emailOld !== emailNew);

          // fallback: se não houver UUID, garantimos um "email de referência"
          const refEmailFromRowKey =
            String(editForm.rowKey || "").startsWith("email:")
              ? normalizeEmail(String(editForm.rowKey).slice(6))
              : "";
          
          const emailRef = emailOld || refEmailFromRowKey || emailNew;
          if (!emailRef) {
            setEditError("Não foi possível identificar o e-mail do registro para salvar. Recarregue a página.");
            return;
          }

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
              email: emailRef,
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
              email: emailChanged ? emailNew : emailRef,
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

          setEditError(
            err?.message ||
            err?.payload?.message ||
            "Erro ao salvar alterações."
          );

        } finally {
          setSavingEdit(false);
        }
      }


  const showingList = activeTab === "admins" ? admins : clients;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AdminToolbar />

        {globalError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        {/* Card superior - Criar/Convidar cliente */}
        <AdminCreateUserForm
          formName={formName}
          setFormName={setFormName}
          formEmpresa={formEmpresa}
          setFormEmpresa={setFormEmpresa}
          formRole={formRole}
          setFormRole={setFormRole}
          formEmail={formEmail}
          setFormEmail={setFormEmail}
          formTelefone={formTelefone}
          setFormTelefone={setFormTelefone}
          formSenha={formSenha}
          setFormSenha={setFormSenha}
          showCreatePassword={showCreatePassword}
          setShowCreatePassword={setShowCreatePassword}
          loadingSubmit={loadingSubmit}
          submitError={submitError}
          onSubmit={handleCreateClient}
          formatPhone={formatPhone}
        />

        {/* Card lista de acessos */}
        <div className="mb-6 rounded-2xl bg-white shadow p-5 md:p-6">
          {/* Tabs */}
          <AdminFilters
            activeTab={activeTab}
            onTabChange={setActiveTab}
            classNames={classNames}
          />

          {/* Tabela */}
          <div className="overflow-x-auto">

            <AdminAccountsTable
              accounts={showingList}
              activeTab={activeTab}
              editingId={editingId}
              editForm={editForm}
              editError={editError}
              savingEdit={savingEdit}
              currentEmail={currentEmail}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              onEditChange={handleEditChange}
              onOpenDetails={openDetails}
              canEditProfile={canEditProfile}
              canEditAccess={canEditAccess}
              getAccId={getAccId}
              getRowKey={getRowKey}
              isUuid={isUuid}
            />

            {detailsOpen && (
              <AdminDetailsModal
                detailsAcc={detailsAcc}
                detailsVisible={detailsVisible}
                closeDetails={closeDetails}
                detailsCloseBtnRef={detailsCloseBtnRef}
                formatPhone={formatPhone}
              />
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
