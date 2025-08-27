// frontend/src/pages/Admin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AdminPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", nome: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const base = import.meta.env.VITE_API_BASE || "http://localhost:4000";

      // pega o token do usuário logado (se você proteger a rota no backend depois)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const r = await fetch(`${base}/admin/create-client`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: form.email.trim(),
          nome: form.nome.trim(),
          // se senha ficar vazia, o backend envia link de cadastro/recovery
          senha: form.senha.trim() || undefined,
        }),
      });

      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Falha ao criar cliente");

      // mensagens simpáticas conforme modo retornado
      let texto = "Ação concluída.";
      if (json.mode === "signup_link_sent") texto = "Convite de cadastro enviado ao cliente.";
      if (json.mode === "recovery_link_sent") texto = "Link de redefinição de senha enviado ao cliente.";
      if (json.mode === "password_updated") texto = "Senha atualizada com sucesso.";

      setMsg({ type: "success", text: texto });
      setForm({ email: "", nome: "", senha: "" });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Erro ao criar cliente" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-emerald-900">Admin</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/orcamento")}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Ir para o Orçamento
            </button>
          </div>
        </header>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Criar cliente</h2>

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm text-slate-600 mb-1">E-mail do cliente</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="cliente@exemplo.com"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm text-slate-600 mb-1">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Nome do cliente"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm text-slate-600 mb-1">
                Senha (opcional)
              </label>
              <input
                type="text"
                value={form.senha}
                onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Deixe vazio para enviar convite"
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Criar cliente"}
              </button>
            </div>
          </form>

          {msg && (
            <div
              className={`mt-4 text-sm rounded-lg px-4 py-3 ${
                msg.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              }`}
            >
              {msg.text}
            </div>
          )}

          <p className="text-xs text-slate-500 mt-4">
            Dica: Se a senha ficar em branco, enviaremos um link de cadastro/redefinição para o e-mail do cliente.
          </p>
        </div>
      </div>
    </div>
  );
}
