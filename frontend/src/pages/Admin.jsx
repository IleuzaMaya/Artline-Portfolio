// frontend/src/pages/Admin.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

// ---------- Input reutilizável com floating label + olho ----------
function FloatInput({
  id, label, type = "text", value, onChange,
  autoComplete, required
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword && show ? "text" : type;

  return (
    <div className="relative">
      <input
        id={id}
        type={actualType}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        placeholder=" " /* chave do floating */
        className="
          peer w-full rounded-xl border border-slate-300 px-4 py-3 outline-none
          focus:ring-2 focus:ring-emerald-500
        "
      />
      <label
        htmlFor={id}
        className="
          pointer-events-none absolute left-4 -top-2.5 px-1 bg-white
          text-slate-500 text-sm transition-all
          peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400
          peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-emerald-700
        "
      >
        {label}
      </label>

      {isPassword && (
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          title={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {/* Eye / Eye-off */}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            {show ? (
              <>
                <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7-11-7-11-7z" />
                <circle cx="12" cy="12" r="3" />
              </>
            ) : (
              <>
                <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7-11-7-11-7z" />
                <circle cx="12" cy="12" r="3" />
                <line x1="3" y1="3" x2="21" y2="21" />
              </>
            )}
          </svg>
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
  const [loading, setLoading] = useState(false);

  const ADMIN_HEADERS = {
    "x-admin-token": import.meta.env.VITE_ADMIN_API_TOKEN || ""
  };

  // criar / convidar cliente (senha opcional)
  const createClient = async (e) => {
    e.preventDefault();
    setToast(null);
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("admin-create-client", {
      headers: ADMIN_HEADERS,
      body: {
        email,
        password: senha || undefined,       // vazio => a função envia convite
        name: nome,
        role: "cliente",
        redirectTo: window.location.origin + "/reset"
      }
    });

    setLoading(false);

    if (error || data?.error) {
      setToast({ ok: false, msg: (data?.error || error?.message || "Falha ao criar/convidar") });
    } else {
      setToast({ ok: true, msg: "Convite enviado / usuário criado." });
      setEmail(""); setNome(""); setSenha("");
    }
  };

  // envio de "esqueci a senha"
  const resetPassword = async (e) => {
    e.preventDefault();
    setToast(null);
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      headers: ADMIN_HEADERS,
      body: { email, redirectTo: window.location.origin + "/reset" }
    });

    setLoading(false);

    if (error || data?.error) {
      setToast({ ok: false, msg: (data?.error || error?.message || "Falha ao enviar e-mail") });
    } else {
      setToast({ ok: true, msg: "E-mail de redefinição enviado." });
    }
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

        <FloatInput
          id="email" label="E-mail" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <FloatInput
          id="nome" label="Nome"
          value={nome} onChange={(e) => setNome(e.target.value)}
        />
        <FloatInput
          id="senha" label="Senha (opcional)"
          type="password" autoComplete="new-password"
          value={senha} onChange={(e) => setSenha(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            className="bg-emerald-600 text-white px-3 py-2 rounded disabled:opacity-60"
            disabled={loading || !email}
          >
            {loading ? "Enviando..." : "Criar/Convidar"}
          </button>

          <button
            onClick={resetPassword} type="button"
            className="border px-3 py-2 rounded disabled:opacity-60"
            disabled={loading || !email}
          >
            Enviar “Esqueci a senha”
          </button>
        </div>
      </form>

      {toast && (
        <div className={`p-3 rounded ${toast.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
