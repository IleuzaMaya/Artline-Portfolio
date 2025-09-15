// frontend/src/pages/Admin.jsx

import { useState } from "react";
import { supabase } from "../lib/supabase";

// ====== UI helpers ======
function Eye({ off }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7-11-7-11-7z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7-11-7-11-7z"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="3" y1="3" x2="21" y2="21"/>
    </svg>
  );
}

// Floating input + label (com suporte a password toggle)
function FloatingInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder = " ",
  required = false,
  password = false,
}) {
  const [show, setShow] = useState(false);
  const isPassword = password || type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="relative">
      <input
        id={id}
        type={inputType}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder} // precisa de placeholder para o peer-placeholder-shown funcionar
        className="peer w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 outline-none
                   focus:ring-2 focus:ring-emerald-500 placeholder-transparent"
      />
      <label
        htmlFor={id}
        className="absolute left-4 top-3 text-slate-500 transition-all pointer-events-none
                   peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
                   peer-focus:top-[-8px] peer-focus:text-xs
                   peer-not-placeholder-shown:top-[-8px] peer-not-placeholder-shown:text-xs
                   bg-white px-1"
      >
        {label}
      </label>

      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md
                     border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          <Eye off={!show} />
        </button>
      )}
    </div>
  );
}

// ====== Página ======
export default function Admin() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [toast, setToast] = useState(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const ADMIN_HEADERS = {
    "x-admin-token": import.meta.env.VITE_ADMIN_API_TOKEN || "",
  };

  function msg(err, fallback) {
    if (!err) return fallback;
    // supabase.functions.invoke retorna error genérico; às vezes o body vem em error.context
    try {
      const maybe = typeof err === "string" ? err : (err?.message || "");
      return maybe || fallback;
    } catch {
      return fallback;
    }
  }

  async function createClient(e) {
    e.preventDefault();
    setToast(null);
    if (!email) return setToast({ ok: false, msg: "Informe o e-mail." });

    setLoadingCreate(true);
    try {
      // Se senha vazia -> invite; senão -> create
      const fn = senha.trim()
        ? "admin-create-client"
        : "admin-invite";

      const payload = senha.trim()
        ? { email, password: senha, name: nome, role: "cliente" }
        : { email, nome, perfil: "cliente" }; // seu admin-invite aceita {nome,email,perfil}

      const { data, error } = await supabase.functions.invoke(fn, {
        headers: ADMIN_HEADERS,
        body: payload,
      });

      if (error) {
        // tenta mostrar a mensagem real do edge
        return setToast({
          ok: false,
          msg: msg(error, "Falha ao criar/invitar o cliente."),
        });
      }

      // sucesso
      let extra = "";
      if (fn === "admin-invite" && data?.senhaGerada) {
        extra = ` Senha gerada: ${data.senhaGerada}`;
      }
      setToast({ ok: true, msg: `Cliente criado/invitedo com sucesso.${extra}` });
      setEmail("");
      setNome("");
      setSenha("");
    } finally {
      setLoadingCreate(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setToast(null);
    if (!email) return setToast({ ok: false, msg: "Informe o e-mail." });

    setLoadingReset(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        headers: ADMIN_HEADERS,
        body: { email, redirectTo: window.location.origin + "/reset" },
      });

      if (error) {
        return setToast({
          ok: false,
          msg: msg(error, "Não foi possível enviar o e-mail de recuperação."),
        });
      }

      setToast({
        ok: true,
        msg: "Se o e-mail existir, enviamos o link de redefinição.",
      });
    } finally {
      setLoadingReset(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-emerald-900">Administração</h1>
        <a
          href="/orcamento"
          className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Ir para o Orçamento
        </a>
      </div>

      <form onSubmit={createClient} className="space-y-4 border p-4 rounded-xl">
        <h2 className="font-semibold">Criar/Convidar cliente</h2>

        <FloatingInput
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <FloatingInput
          id="nome"
          label="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
        />

        <FloatingInput
          id="senha"
          label="Senha (opcional)"
          password
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
          placeholder=" "
        />

        <div className="flex gap-2">
          <button
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl disabled:opacity-60"
            disabled={loadingCreate}
          >
            {loadingCreate ? "Processando..." : "Criar/Convidar"}
          </button>

          <button
            onClick={resetPassword}
            type="button"
            className="border px-4 py-2 rounded-xl disabled:opacity-60"
            disabled={loadingReset}
          >
            {loadingReset ? "Enviando..." : 'Enviar “Esqueci a senha”'}
          </button>
        </div>
      </form>

      {toast && (
        <div
          className={`p-3 rounded ${toast.ok
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
