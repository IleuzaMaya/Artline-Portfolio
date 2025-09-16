// frontend/src/pages/Admin.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../lib/adminApi";
import { useToast } from "../ui/toast.jsx";

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());
}

export default function Admin() {
  const navigate = useNavigate();
  const { show } = useToast();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const emailOk = useMemo(() => isValidEmail(email), [email]);
  const canCreate = useMemo(
    () => emailOk && name.trim().length >= 2 && !busy,
    [emailOk, name, busy]
  );
  const canReset = useMemo(() => emailOk && !busy, [emailOk, busy]);

  async function handleCreate() {
    if (!canCreate) return;
    setMsg("");
    setBusy(true);
    try {
      const e = email.trim();
      const n = name.trim();
      const p = String(password || "");
      if (!isValidEmail(e)) throw new Error("E-mail inválido");
      if (n.length < 2) throw new Error("Informe o nome");
      if (p && p.length < 8) throw new Error("Senha precisa ter 8+ caracteres");

      const res = await adminApi.createClient({ email: e, name: n, password: p });

      if (res.action_link) {
        // mostra toast com link (e copia)
        show("Convite enviado", { href: res.action_link, copy: res.action_link, duration: 6000 });
        setMsg(""); // quando tem link usamos só o toast
      } else {
        setMsg("Convite enviado / usuário criado.");
      }

      setEmail("");
      setName("");
      setPassword("");
    } catch (e) {
      setMsg(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSendReset() {
    if (!canReset) return;
    setMsg("");
    setBusy(true);
    try {
      await adminApi.resetPassword({
        email: email.trim(),
        redirectTo: "https://app.artemoldurados.com.br/reset",
      });
      setMsg("E-mail de redefinição enviado.");
    } catch (e) {
      setMsg(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-bold text-emerald-900">Administração</h1>
        <button
          type="button"
          className="ml-auto rounded-xl border px-4 py-2"
          onClick={() => navigate("/admin/gestao")}
        >
          Gestão de contas
        </button>
        <a
          href="/orcamento"
          className="rounded-xl bg-emerald-700 text-white px-4 py-2"
        >
          Ir para o Orçamento
        </a>
      </div>

      <div className="rounded-2xl border p-6">
        <h2 className="text-xl font-semibold mb-4">Criar/Convidar cliente</h2>

        <div className="space-y-4">
          <input
            className="w-full rounded-xl border px-4 py-3"
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl border px-4 py-3"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="relative">
            <input
              className="w-full rounded-xl border px-4 py-3 pr-12"
              placeholder="Senha (opcional)"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70"
              onClick={() => setShowPwd((v) => !v)}
              aria-label="Mostrar senha"
            >
              👁
            </button>
          </div>

          <div className="flex gap-3">
            <button
              disabled={!canCreate}
              onClick={handleCreate}
              className="rounded-xl bg-emerald-700 text-white px-5 py-3 disabled:opacity-50"
            >
              Criar/Convidar
            </button>

            <button
              disabled={!canReset}
              onClick={handleSendReset}
              className="rounded-xl border px-5 py-3 disabled:opacity-50"
            >
              Enviar “Esqueci a senha”
            </button>
          </div>

          {msg && (
            <div
              className={`mt-4 rounded-lg px-4 py-3 ${
                msg.startsWith("Convite") || msg.startsWith("E-mail")
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
