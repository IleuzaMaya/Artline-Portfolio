// frontend/src/pages/ResetPassword.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../ui/toast.jsx";

function parseHashParams() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  if (!hash || !hash.startsWith("#")) return {};
  const params = new URLSearchParams(hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const type = params.get("type"); // ex.: 'recovery'
  return { access_token, refresh_token, type };
}

export default function ResetPassword() {
  const { show } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const [meEmail, setMeEmail] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  // Título da página (substitui Helmet)
  useEffect(() => {
    document.title = "Artemoldurados — Redefinir senha";
  }, []);

  // 1) Se veio por link de recuperação (#access_token/#refresh_token), cria sessão local
  useEffect(() => {
    const { access_token, refresh_token, type } = parseHashParams();

    async function ensureSessionFromHash() {
      if (access_token && refresh_token) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
          setHasRecoverySession(type === "recovery");
          // limpa o hash da URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search
          );
        } catch (err) {
          show({ type: "error", message: `Falha ao validar link de recuperação: ${err.message}` });
        }
      }
    }

    ensureSessionFromHash();
  }, [show]);

  // 2) Descobre o e-mail atual (sessão normal ou via recovery)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMeEmail(data?.user?.email || "");
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password || password.length < 8) {
      show({ type: "error", message: "A senha deve ter pelo menos 8 caracteres." });
      return;
    }
    if (password !== confirm) {
      show({ type: "error", message: "As senhas não coincidem." });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      show({ type: "success", message: "Senha atualizada com sucesso." });
      setPassword("");
      setConfirm("");

      // opcional: redirecionar após alguns segundos
      // setTimeout(() => (window.location.href = "/login"), 1500);
    } catch (err) {
      show({ type: "error", message: `Não foi possível atualizar: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  const subtitle = hasRecoverySession
    ? "Defina uma nova senha para sua conta."
    : meEmail
    ? `Defina uma nova senha para ${meEmail}.`
    : "Informe a nova senha para sua conta.";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-xl font-semibold text-emerald-800 mb-1">Definir nova senha</h1>
        <p className="text-sm text-slate-600 mb-6">{subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Nova senha</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>

          <p className="text-xs text-slate-500 mt-2">
            Dica: use ao menos 8 caracteres, misturando letras e números.
          </p>
        </form>
      </div>
    </div>
  );
}
