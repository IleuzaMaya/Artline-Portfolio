// frontend/src/pages/ResetPassword.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const [senha, setSenha] = useState("");
  const [ok, setOk] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOk(null);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    setOk(error ? { type: "err", msg: error.message } :
                  { type: "ok", msg: "Senha alterada! Você já pode entrar." });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={handleReset} className="w-full max-w-sm bg-white rounded-2xl p-6 shadow">
        <h1 className="text-xl font-semibold text-emerald-800">Definir nova senha</h1>
        <p className="text-slate-500 text-sm mt-1">
          Você chegou aqui pelo link de recuperação enviado ao seu e-mail.
        </p>
        <label className="block mt-4 text-sm text-slate-600">Nova senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mt-1"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full bg-emerald-600 text-white rounded-lg py-2 font-medium disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
        {ok && (
          <div className={`mt-4 text-sm rounded-lg px-3 py-2 ${ok.type === "err"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>
            {ok.msg}
          </div>
        )}
      </form>
    </div>
  );
}
