// frontend/src/pages/Admin.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";


export default function Admin() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [toast, setToast] = useState(null);

  const createClient = async (e) => {
    e.preventDefault();
    setToast(null);
    const { data, error } = await supabase.functions.invoke("admin-create-client", {
      body: { email, nome, senha: senha || null }
    });
    if (error) setToast({ ok: false, msg: error.message });
    else {
      setToast({ ok: true, msg: "Convite enviado / usuário criado." });
      setEmail(""); setNome(""); setSenha("");
    }

  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setToast(null);
    const { error } = await supabase.functions.invoke("admin-reset-password", {
      body: { email }
    });
    setToast(error ? { ok:false, msg:error.message } : { ok:true, msg:"E-mail de redefinição enviado." });

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
        <div className={`p-3 rounded ${toast.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
