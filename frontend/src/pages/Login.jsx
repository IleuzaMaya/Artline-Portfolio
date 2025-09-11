// frontend/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ADMIN_DOMAIN = (import.meta.env.VITE_ADMIN_EMAIL_DOMAIN || "").trim();

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const next = new URLSearchParams(location.search).get("next") || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      // 1) Validação de domínio (opcional)
      if (ADMIN_DOMAIN && ADMIN_DOMAIN !== "*") {
        const ok = email.toLowerCase().endsWith(`@${ADMIN_DOMAIN.toLowerCase()}`);
        if (!ok) throw new Error(`E-mail precisa terminar com @${ADMIN_DOMAIN}`);
      }

      // 2) Login Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      console.log("[login] result:", { data, error });

      if (error) throw error;
      if (!data?.session?.access_token) throw new Error("Sem token de sessão.");

      // 3) Persistir token onde o RequireAuth procura
      localStorage.setItem("auth_token", data.session.access_token);

      // (Opcional) também guardar refresh_token se quiser
      // localStorage.setItem("auth_refresh_token", data.session.refresh_token);

      // 4) Ir para a página solicitada
      navigate(next, { replace: true });
    } catch (err) {
      console.error("[login] erro:", err);
      setErro(err.message || "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">ClienteAdmin</h1>

        <label className="block">
          <span className="text-sm">E-mail</span>
          <input
            type="email"
            className="mt-1 w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>

        <label className="block">
          <span className="text-sm">Senha</span>
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded px-3 py-2 border bg-black text-white disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {/* debug rápido do ambiente */}
        <details className="text-xs opacity-60">
          <summary>Debug</summary>
          <pre>
            {JSON.stringify(
              {
                VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
                VITE_SUPABASE_FUNCTIONS_URL: import.meta.env.VITE_SUPABASE_FUNCTIONS_URL,
                VITE_ADMIN_EMAIL_DOMAIN: ADMIN_DOMAIN || "(vazio)",
              },
              null,
              2
            )}
          </pre>
        </details>
      </form>
    </div>
  );
}
