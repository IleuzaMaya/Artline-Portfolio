// frontend/src/pages/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { adminApi } from "../lib/adminApi";
import { useToast } from "../ui/toast.jsx";

/* ===================== Helpers ===================== */
// Telefone BR
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
function formatPhoneBR(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

// Função utilitária para chamar Edge Functions (usa adminApi se existir)
async function callFunction(path, payload) {
  // 1) Tenta via adminApi (se você tiver configurado)
  if (adminApi && typeof adminApi === "function") {
    return adminApi(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": import.meta.env.VITE_ADMIN_API_TOKEN,
      },
      body: JSON.stringify(payload),
    }).then((r) => (r.json ? r.json() : r));
  }
  // 2) Fallback direto via fetch
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

/* ===================== Componente ===================== */
export default function Admin() {
  const { show } = useToast();

  // Dados do usuário logado (para esconder "Trocar senha" da própria linha)
  const [meEmail, setMeEmail] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMeEmail(data?.user?.email?.toLowerCase() || "");
    });
  }, []);

  /* ---------- Criar/Convidar cliente ---------- */
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [senha, setSenha] = useState(""); // opcional
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
        nome: (nome || "").trim(),
        telefone: onlyDigits(telefone),
        empresa: (empresa || "").trim(),
        senha: (senha || "").trim(), // se vazio, a Edge Function envia convite
      };
      const res = await callFunction("admin-create-client", payload);
      if (res?.created) {
        show({ type: "success", message: "Cliente criado com senha definida." });
      } else if (res?.invited) {
        show({ type: "success", message: "Convite enviado por e-mail (definir senha)." });
      } else {
        show({ type: "success", message: "Operação concluída." });
      }
      setSenha("");
    } catch (err) {
      show({ type: "error", message: `Erro ao criar/convidar: ${err.message}` });
    } finally {
      setLoadingCreate(false);
    }
  }

  /* ---------- Enviar link de redefinição (card) ---------- */
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

  /* ---------- Enviar link de redefinição (por linha da tabela) ---------- */
  async function handleSendResetRow(email) {
    try {
      const target = String(email || "").trim();
      if (!target) throw new Error("E-mail inválido");
      await callFunction("admin-reset-password", { email: target });
      show({ type: "success", message: "Link de redefinição enviado." });
    } catch (err) {
      show({ type: "error", message: `Erro ao enviar link: ${err.message}` });
    }
  }

  const telefoneMask = useMemo(() => formatPhoneBR(telefone), [telefone]);

  return (
    <>
      <Helmet>
        <title>Artemoldurados — Administração</title>
      </Helmet>

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

        {/* ========== Card: Criar/Convidar Cliente ========== */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-lg font-medium text-slate-800">Criar/Convidar cliente</h2>
          <p className="text-sm text-slate-500 mb-4">
            Preencha os dados. Se <strong>senha</strong> ficar em branco, será enviado um convite para o cliente
            definir a própria senha.
          </p>

          <form onSubmit={handleCreateClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="md:col-span-2">
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

        {/* ========== Card: Enviar link de redefinição (isolado) ========== */}
        <div className="bg-white rounded-2xl shadow p-5 mt-6">
          <h2 className="text-lg font-medium text-slate-800">Enviar link de redefinição</h2>
          <p className="text-sm text-slate-500 mb-4">
            {emailReset
              ? (
                <>
                  Enviar link para <span className="font-medium">{emailReset.trim().toLowerCase()}</span> redefinir a senha.
                </>
                )
              : <>Informe o e-mail para enviar o link de redefinição.</>}
          </p>

          <form onSubmit={handleSendReset} className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-60"
              >
                {loadingReset ? "Enviando..." : "Enviar link"}
              </button>
            </div>
          </form>
        </div>

        {/* ========== Gestão de contas ==========
            MANTENHA a sua tabela atual.
            Apenas SUBSTITUA o conteúdo da célula de AÇÕES pelo bloco abaixo. */}
        {/* EXEMPLO de célula de AÇÕES dentro do seu map de linhas (rows/users): */}
        {false && (
          <td className="px-3 py-2">
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary" onClick={() => saveRow(row)}>
                Salvar
              </button>

              <button className="btn btn-outline" onClick={() => handleSendResetRow(row.email)}>
                Enviar reset
              </button>

              {row.email?.toLowerCase() !== meEmail && (
                <button
                  className="btn btn-outline"
                  title="Enviar link para este usuário trocar a senha"
                  onClick={() => handleSendResetRow(row.email)}
                >
                  Trocar senha
                </button>
              )}
            </div>
          </td>
        )}
        {/* ====== /Gestão de contas ====== */}

        {/* Rodapé simples */}
        <div className="text-xs text-slate-500 mt-6">
          Logado como: <span className="font-medium">{meEmail || "—"}</span>
        </div>
      </div>
    </>
  );
}
