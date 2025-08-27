// frontend/src/pages/Admin.jsx
import { useEffect, useState } from "react";
import { useState } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [toast, setToast] = useState(null);

  const createClient = async (e) => {
    e.preventDefault();
    setToast(null);
    const r = await fetch(`${API}/admin/create-client`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nome, senha: senha || undefined }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setToast({ ok: true, msg: "Convite enviado / usuário criado." });
      setEmail(""); setNome(""); setSenha("");
    } else {
      setToast({ ok: false, msg: j.error || "Falha ao criar usuário." });
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setToast(null);
    const r = await fetch(`${API}/admin/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const j = await r.json().catch(() => ({}));
    setToast(r.ok
      ? { ok: true, msg: "E-mail de redefinição enviado." }
      : { ok: false, msg: j.error || "Falha ao enviar redefinição." }
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
        <input className="border px-3 py-2 rounded w-full" placeholder="E-mail"
               value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="border px-3 py-2 rounded w-full" placeholder="Nome"
               value={nome} onChange={(e) => setNome(e.target.value)} />
        <input className="border px-3 py-2 rounded w-full" placeholder="Senha (opcional)"
               value={senha} onChange={(e) => setSenha(e.target.value)} />
        <div className="flex gap-2">
          <button className="bg-emerald-600 text-white px-3 py-2 rounded">
            Criar/Convidar
          </button>
          <button onClick={resetPassword} type="button"
                  className="border px-3 py-2 rounded">
            Enviar “Esqueci a senha”
          </button>
        </div>
      </form>

      {toast && (
        <div
          className={`p-3 rounded ${
            toast.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
