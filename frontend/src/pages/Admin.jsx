// frontend/src/pages/Admin.jsx
import { useState } from "react";
import { supabase } from '../lib/supabase';


const FN_BASE = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || "").replace(/\/$/, "");
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN || "";

function FloatingInput({ label, type="text", value, onChange, autoComplete, rightSlot }) {
  const [focused, setFocused] = useState(false);
  const filled = focused || (value ?? "").length > 0;

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        className="peer w-full border border-slate-300 rounded-2xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <label
        className={`absolute left-3 px-1 bg-white transition-all pointer-events-none
        ${filled ? "-top-2.5 text-xs text-slate-600" : "top-3 text-slate-400"}`}
      >
        {label}
      </label>
      {rightSlot && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
      )}
    </div>
  );
}

function PasswordInput({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <FloatingInput
      label={label}
      type={show ? "text" : "password"}
      value={value}
      onChange={onChange}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600"
          title={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {/* eye icon */}
          {show ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/>
            </svg>
          )}
        </button>
      }
    />
  );
}


async function callFunction(fnName, payload) {
  const { data, error } = await supabase.functions.invoke(fnName, {
    body: payload,
    headers: { 'x-admin-token': import.meta.env.VITE_ADMIN_API_TOKEN },
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}



export default function Admin() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const createClient = async (e) => {
    e.preventDefault();
    setToast(null);
    setBusy(true);
    try {
      await callFunction("admin-create-client", {
        email,
        password: senha || undefined,   // se vazio, a função envia convite
        name: nome,
        role: "cliente",
        redirectTo: `${window.location.origin}/reset`,
      });
      setToast({ ok: true, msg: "Convite enviado / usuário criado." });
      setEmail(""); setNome(""); setSenha("");
    } catch (err) {
      setToast({ ok: false, msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setToast(null);
    setBusy(true);
    try {
      await callFunction("admin-reset-password", {
        email,
        redirectTo: `${window.location.origin}/reset`,
      });
      setToast({ ok: true, msg: "E-mail de redefinição enviado." });
    } catch (err) {
      setToast({ ok: false, msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-emerald-900">Administração</h1>
        <a href="/orcamento" className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
          Ir para o Orçamento
        </a>
      </div>

      <form onSubmit={createClient} className="space-y-4 border p-5 rounded-2xl">
        <h2 className="font-semibold">Criar/Convidar cliente</h2>

        <FloatingInput label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <FloatingInput label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
        <PasswordInput label="Senha (opcional)" value={senha} onChange={(e) => setSenha(e.target.value)} />

        <div className="flex gap-2">
          <button disabled={busy} className="bg-emerald-600 disabled:opacity-60 text-white px-4 py-2 rounded-2xl">
            Criar/Convidar
          </button>
          <button onClick={resetPassword} type="button"
                  className="border px-4 py-2 rounded-2xl disabled:opacity-60" disabled={busy}>
            Enviar “Esqueci a senha”
          </button>
        </div>

        {toast && (
          <div className={`mt-3 p-3 rounded ${toast.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {toast.msg}
          </div>
        )}
      </form>
    </div>
  );
}
