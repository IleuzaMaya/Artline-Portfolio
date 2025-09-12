// frontend/src/pages/Admin.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

function FloatingInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required = false,
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        placeholder=" "
        className="
          peer w-full rounded-xl border border-slate-300
          px-3 pt-5 pb-2 outline-none
          focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
        "
      />
      <label
        htmlFor={id}
        className="
          pointer-events-none absolute left-3 top-2 px-1
          bg-white text-slate-500 transition-all
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2
          peer-placeholder-shown:text-base
          peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-emerald-700
          peer-not-placeholder-shown:text-xs
        "
      >
        {label}
      </label>
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

    const { error } = await supabase.functions.invoke("admin-create-client", {
      headers: ADMIN_HEADERS,
      body: {
        email,
        password: senha || undefined,
        name: nome,
        role: "cliente",
      },
    });

    if (error) setToast({ ok: false, msg: error.message });
    else {
      setToast({ ok: true, msg: "Convite enviado / usuário criado." });
      setEmail("");
      setNome("");
      setSenha("");
    }
  };

  // reset de senha
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
