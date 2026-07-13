// frontend/src/components/AuthSplit.jsx
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { ENV } from "../config/env";

// Ícones inline (olho)
const EyeIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7-11-7-11-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7-11-7-11-7z"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="3" y1="3" x2="21" y2="21"/>
  </svg>
);

// Ícones de volume (inline)
const VolumeOnIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"></polygon>
    <path d="M15 9a4 4 0 0 1 0 6"></path>
    <path d="M17.5 6.5a7 7 0 0 1 0 11"></path>
  </svg>
);
const VolumeOffIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"></polygon>
    <line x1="23" y1="9" x2="17" y2="15"></line>
    <line x1="17" y1="9" x2="23" y2="15"></line>
  </svg>
);

// Input de senha com toggle 👀
function PasswordInput({ id, value, onChange, required = true, autoComplete = "current-password" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        className="w-full border border-slate-300 rounded-xl px-4 py-2 pr-14 outline-none focus:ring-2 focus:ring-emerald-500"
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-600"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default function AuthSplit({ onAuth }) {
  const [role, setRole] = useState("cliente"); // 'cliente' | 'admin'
  const [form, setForm] = useState({ email: "", senha: "", usuario: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  // dentro do componente AuthSplit (já tendo import { useState, useRef } from "react"; no topo)
  const videoRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);

  const toggleSound = () => {
    // Alterna o estado; quando ligar o som, chamamos play() logo depois
    setSoundOn((on) => {
      const next = !on;
      // após o React atualizar o atributo muted, pedimos para tocar com áudio
      if (next) {
        // pequeno timeout garante que o DOM refletiu o novo muted={false}
        setTimeout(() => {
          const v = videoRef.current;
          if (v) {
            v.volume = 0.8;
            v.play().catch(() => {});
          }
        }, 0);
      }
      return next;
    });
  };


  const isAdmin = role === "admin";
  const ADMIN_DOMAIN = import.meta.env.VITE_ADMIN_EMAIL_DOMAIN || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      if (isAdmin) {
        // --- ADMIN ---
        let login = form.usuario?.trim();
        if (login && !login.includes("@") && ADMIN_DOMAIN) {
          login = `${login}@${ADMIN_DOMAIN}`;
        }
        if (!login) throw new Error("Informe o usuário (e/ou configure VITE_ADMIN_EMAIL_DOMAIN).");

        const { error } = await supabase.auth.signInWithPassword({
          email: login,
          password: form.senha,
        });
        if (error) throw error;

        // e-mail real da sessão
        const { data: { user } = {} } = await supabase.auth.getUser();
        const emailFromAuth = user?.email?.trim().toLowerCase();
        if (!emailFromAuth) {
          await supabase.auth.signOut();
          throw new Error("Falha ao iniciar sessão.");
        }

        // confere permissão
        const { data: perm, error: e2 } = await supabase
          .from("adm_acessos_permitidos")
          .select("role, ativo")
          .eq("email", emailFromAuth)
          .maybeSingle();

        if (e2) throw e2;
        if (!perm?.ativo || perm.role !== "admin") {
          await supabase.auth.signOut();
          throw new Error("Este usuário não tem permissão de administrador.");
        }

        setForm({ email: "", senha: "", usuario: "" });
        onAuth?.({ who: "admin", user });
        navigate("/admin", { replace: true });
      } else {
        // --- CLIENTE ---
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.senha,
        });
        if (error) throw error;

        const { data: { session } = {} } = await supabase.auth.getSession();
        if (!session) throw new Error("Falha ao iniciar sessão.");

        setForm({ email: "", senha: "", usuario: "" });
        onAuth?.(session);
        navigate("/orcamento", { replace: true });
      }
    } catch (err) {
      const raw = String(err?.message || "");
      const low = raw.toLowerCase();

      const msgFriendly =
        low.includes("invalid login credentials") ? "Login inválido. Verifique e-mail/usuário e senha." :
        low.includes("email not confirmed") ? "E-mail ainda não confirmado. Verifique sua caixa de entrada." :
        low.includes("too many requests") ? "Muitas tentativas. Aguarde um pouco e tente novamente." :
        (raw || "Falha no login.");

      setMsg({ type: "error", text: msgFriendly });
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      {/* CARD / GRID */}
      <div className="
        w-full max-w-5xl
        grid grid-cols-1 md:grid-cols-2
        items-stretch              /* 👉 colunas esticam igualmente */
        md:min-h-[420px]           /* 👉 altura confortável no desktop */
        rounded-2xl overflow-hidden shadow-xl
        bg-white border border-slate-200
      ">
        {/* COLUNA ESQUERDA — VÍDEO */}
        <div className="relative overflow-hidden bg-black h-40 sm:h-48 md:h-full">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted={!soundOn}
            loop
            playsInline
            poster="/fundo-login-poster.jpg"
            onError={(ev) => (ev.currentTarget.style.display = 'none')}
          >
            <source src="/fundo-login.mp4" type="video/mp4" />
          </video>

          <button
            type="button"
            onClick={toggleSound}
            className="absolute z-20 top-3 left-3 bg-white/85 hover:bg-white text-slate-800 rounded-full p-2 shadow border border-slate-200"
            aria-label={soundOn ? 'Desligar som' : 'Ligar som'}
            title={soundOn ? 'Desligar som' : 'Ligar som'}
          >
            {soundOn ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"></polygon>
                <path d="M15 9a4 4 0 0 1 0 6"></path>
                <path d="M17.5 6.5a7 7 0 0 1 0 11"></path>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            )}
          </button>

          <motion.div
            className="absolute inset-0 pointer-events-none z-10"
            initial={{ opacity: 0.2 }}
            animate={{ opacity: 0.2 }}
          />
        </div>


        {/* COLUNA DIREITA — conteúdo */}
        <div className="px-6 py-7 md:px-9 md:py-9">
          {/* LOGO */}
          <div className="flex justify-center mb-6 md:mb-7">
            <img src="/artline-logo-horizontal-dark.png" alt="Artline" className="h-10 md:h-12 opacity-90" />
          </div>

          {/* SWITCH */}
          <div className="relative mx-auto w-full max-w-sm bg-slate-100 rounded-full p-1 flex">
            <button
              className={`relative z-10 flex-1 py-1.5 text-[13px] font-medium transition ${!isAdmin ? "text-emerald-900" : "text-slate-500"}`}
              onClick={() => setRole("cliente")}
              aria-pressed={!isAdmin}
            >
              Cliente
            </button>
            <button
              className={`relative z-10 flex-1 py-1.5 text-[13px] font-medium transition ${isAdmin ? "text-emerald-900" : "text-slate-500"}`}
              onClick={() => setRole("admin")}
              aria-pressed={isAdmin}
            >
              Administrador
            </button>
            <motion.span
              className="absolute top-1 bottom-1 w-1/2 rounded-full bg-white shadow"
              layout
              initial={false}
              animate={{ x: isAdmin ? "100%" : "0%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </div>

          {/* TÍTULO + SUB */}
          <div className="mt-6 mb-5">
            <h1 className="text-xl md:text-1xl font-bold text-emerald-900">
              {isAdmin ? "Acesso do Administrador" : "Entre na sua conta"}
            </h1>
            <p className="text-slate-500 mt-1 text-[13px] md:text-sm">
              {isAdmin ? "Use seu usuário interno para gerenciar cadastros." : "Acompanhe pedidos e orçamentos."}
            </p>
          </div>

          {/* FORM */}
          <div className="relative w-full max-w-sm">
            {isAdmin ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Usuário (ou e-mail)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.usuario}
                    onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Senha</label>
                  <PasswordInput
                    id="senha-admin"
                    value={form.senha}
                    onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60"
                >
                  {loading ? "Validando..." : "Logar (Admin)"}
                </button>
                <p className="text-center text-xs text-slate-500">Se não possuir acesso, contate o responsável.</p>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">E-mail</label>
                  <input
                    type="email"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    autoComplete="username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Senha</label>
                  <PasswordInput
                    id="senha-cliente"
                    value={form.senha}
                    onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
                <div className="text-center text-sm text-slate-500 space-y-1">
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!form.email) return setMsg({ type: "error", text: "Informe seu e-mail." });
                      const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
                        redirectTo: `${ENV.SITE_URL}/reset`,
                      });
                      setMsg(error ? { type: "error", text: error.message } : { type: "success", text: "Enviamos um link de redefinição de senha." });
                    }}
                    className="text-emerald-700 hover:underline"
                  >
                    Esqueceu a senha?
                  </a>
                </div>
              </form>
            )}
          </div>

          {/* mensagens */}
          {msg && (
            <div
              className={`mt-5 text-[13px] rounded-lg px-3.5 py-2.5 ${
                msg.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200 border"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="mt-6 text-[11px] text-slate-400">
            © {new Date().getFullYear()} Artline — todos os direitos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}
