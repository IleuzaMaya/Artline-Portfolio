// frontend/src/components/AuthSplit.jsx
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Volume2, VolumeX } from "lucide-react";


// helper: input de senha com ícone 👀
function PasswordInput({
  id,
  value,
  onChange,
  required = true,
  autoComplete = "current-password",
}) {
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
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}


export default function AuthSplit({ onAuth }) {
  const [role, setRole] = useState("cliente");
  const [form, setForm] = useState({ email: "", senha: "", usuario: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  // controle de áudio do vídeo
  const videoRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);

  const toggleSound = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (soundOn) {
        v.muted = true;
        setSoundOn(false);
      } else {
        v.muted = false;
        v.volume = 0.7; // opcional
        await v.play(); // importante após gesto do usuário
        setSoundOn(true);
      }
    } catch (e) {
      console.error(e);
    }
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

      // 1) autentica
      const { error } = await supabase.auth.signInWithPassword({
        email: login,
        password: form.senha,
      });
      if (error) throw error;

      // 2) pega o e-mail REAL da sessão
      const { data: { user } = {} } = await supabase.auth.getUser();
      const emailFromAuth = user?.email?.trim().toLowerCase();
      if (!emailFromAuth) {
        await supabase.auth.signOut();
        throw new Error("Falha ao iniciar sessão.");
      }

      // 3) confere permissão usando o e-mail da sessão
      const { data: perm, error: e2 } = await supabase
        .from("acessos_permitidos")
        .select("role, ativo")
        .eq("email", emailFromAuth)      // <- usa o da sessão
        .maybeSingle();

      if (e2) throw e2;
      if (!perm || !perm.ativo || perm.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("Este usuário não tem permissão de administrador.");
      }

      // OK: limpa e navega
      setForm({ email: "", senha: "", usuario: "" });
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
      navigate("/orcamento", { replace: true });
    }
  } catch (err) {
    setMsg({ type: "error", text: err.message || "Falha no login." });
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl bg-white border border-slate-200">
        {/* COLUNA ESQUERDA — imagem/vídeo */}
        <div className="relative h-48 md:h-auto">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted={!soundOn}     // começa mudo; libera som após clique
            loop
            playsInline
            onError={(ev) => (ev.currentTarget.style.display = "none")}
          >
            <source src="/fundo-login.mp4" type="video/mp4" />
          </video>

          {/* Botão de som sobre o vídeo */}
          <button
            type="button"
            onClick={toggleSound}
            className="absolute bottom-4 left-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/55 text-white text-xs px-3 py-1.5 backdrop-blur hover:bg-black/70"
            aria-label={soundOn ? "Desligar som" : "Ligar som"}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundOn ? "Som ligado" : "Ativar som"}
          </button>

          {/* overlay opcional */}
          <motion.div className="absolute inset-0" initial={{ opacity: 0.9 }} animate={{ opacity: 0.9 }} />
        </div>

        {/* COLUNA DIREITA — conteúdo */}
        <div className="px-6 py-7 md:px-9 md:py-9">
          {/* LOGO CENTRALIZADO */}
          <div className="flex justify-center mb-6 md:mb-7">
            <img
              src="/Logo.png"
              alt="Art Emoldurados"
              className="h-10 md:h-12 opacity-90"
            />
          </div>

          {/* SWITCH menor */}
          <div className="relative mx-auto w-full max-w-sm bg-slate-100 rounded-full p-1 flex">
            <button
              className={`relative z-10 flex-1 py-1.5 text-[13px] font-medium transition ${
                role === "cliente" ? "text-emerald-900" : "text-slate-500"
              }`}
              onClick={() => setRole("cliente")}
              aria-pressed={role === "cliente"}
            >
              Cliente
            </button>
            <button
              className={`relative z-10 flex-1 py-1.5 text-[13px] font-medium transition ${
                role === "admin" ? "text-emerald-900" : "text-slate-500"
              }`}
              onClick={() => setRole("admin")}
              aria-pressed={role === "admin"}
            >
              Administrador
            </button>
            <motion.span
              className="absolute top-1 bottom-1 w-1/2 rounded-full bg-white shadow"
              layout
              initial={false}
              animate={{ x: role === "admin" ? "100%" : "0%" }}
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

          {/* FORM deslizante (inputs + botões mais compactos) */}
          <div className="relative w-full max-w-sm">
            {isAdmin ? (
              // --- ADMIN ---
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

                <p className="text-center text-xs text-slate-500">
                  Se não possuir acesso, contate o responsável.
                </p>
              </form>
            ) : (
              // --- CLIENTE ---
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
                        redirectTo: window.location.origin + "/reset",
                      });
                      setMsg(
                        error
                          ? { type: "error", text: error.message }
                          : { type: "success", text: "Enviamos um link de redefinição de senha." }
                      );
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
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="mt-6 text-[11px] text-slate-400">
            © {new Date().getFullYear()} Art Emoldurados — todos os direitos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}
