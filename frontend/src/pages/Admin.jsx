// frontend/src/pages/Admin.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

// Ícones olho
const Eye = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7-11-7-11-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7-11-7-11-7z"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="3" y1="3" x2="21" y2="21"/>
  </svg>
);

// Input com floating label (+ opcional toggle de senha)
function FloatingInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required = false,
  enablePasswordToggle = false,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const realType = enablePasswordToggle && isPassword && show ? "text" : type;

  return (
    <div className="relative">
      <input
        id={id}
        type={realType}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        placeholder=" "                       // truque do floating
        className="
          peer w-full rounded-xl border border-slate-300
          px-3 pt-5 pb-2 pr-12 outline-none
          focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
        "
      />
      <label
        htmlFor={id}
        className="
          pointer-events-none absolute left-3 top-2 z-[1] px-1 bg-white
          text-slate-500 transition-all
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base
          peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-emerald-700
          peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs
        "
      >
        {label}
      </label>

      {enablePasswordToggle && isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        >
          {show ? <EyeOff /> : <Eye />}
        </button>
      )}
    </div>
  );
}

export default function Admin() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [toast, setToast] = useState(null);

  const ADMIN_HEADERS = {
    "x-admin-token": import.meta.env.VITE_ADMIN_API_TOKEN || "",
  };

  // criar cliente
  const createClient = async (e) => {
    e.preventDefault();
    setToast(null);

    // cria com a senha informada OU com uma aleatória no server (se você ajustar a Edge),
    // mas aqui vamos disparar e-mail se a senha estiver vazia.
    const { error } = await supabase.functions.invoke("admin-create-client", {
      headers: ADMIN_HEADERS,
      body: {
        email,
        password: senha || undefined,
        name: nome,
        role: "cliente",
      },
    });

    if (error) {
      setToast({ ok: false, msg: error.message });
      return;
    }

    // se não informou senha, envia e-mail para definir a senha
    if (!senha) {
      await supabase.functions.invoke("admin-reset-password", {
        headers: ADMIN_HEADERS,
        body: { email, redirectTo: window.location.origin + "/reset" },
      });
      setToast({
        ok: true,
        msg: "Cliente criado. Enviamos um e-mail para definir a senha.",
      });
    } else {
      setToast({ ok: true, msg: "Cliente criado com a senha informada." });
    }

    setEmail("");
    setNome("");
    setSenha("");
  };

  // reset de senha manual
  const resetPassword = async (e) => {
    e.preventDefault();
    setToast(null);

    const { error } = await supabase.functions.invoke("admin-reset-password", {
      headers: ADMIN_HEADERS,
      body: { email, redirectTo: window.location.origin + "/reset" },
    });

    setToast(
      error
        ? { ok: false, msg: error.message }
        : { ok: true, msg: "E-mail de redefinição enviado." }
    );
  };

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

      <form onSubmit={createClient} className="space-y-3 border p-4 rounded-xl">
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
          required
        />

        <FloatingInput
          id="senha"
          label="Senha (opcional)"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
          enablePasswordToggle
        />

        <div className="flex gap-2">
          <button className="bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700">
            Criar/Convidar
          </button>
          <button
            onClick={resetPassword}
            type="button"
            className="border px-3 py-2 rounded-lg hover:bg-slate-50"
          >
            Enviar “Esqueci a senha”
          </button>
        </div>
      </form>

      {toast && (
        <div
          className={`p-3 rounded ${
            toast.ok
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
