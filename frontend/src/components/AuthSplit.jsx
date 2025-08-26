// frontend/src/components/AuthSplit.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const ADMIN_EMAIL = "admin@artemoldurados.com";
const ADMIN_SENHA = "123456"; // trocar depois

export default function AuthSplit() {
  const [modo, setModo] = useState<"cliente" | "admin">("cliente");

  // login (cliente)
  const [emailCliente, setEmailCliente] = useState("");
  const [senhaCliente, setSenhaCliente] = useState("");

  // login (admin)
  const [emailAdmin, setEmailAdmin] = useState("");
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [adminOK, setAdminOK] = useState(false);

  // cadastro cliente (visível só após adminOK)
  const [novo, setNovo] = useState({
    nome: "",
    email: "",
    senha: "",
    telefone: "",
  });

  const navigate = useNavigate();

  const entrarCliente = (e) => {
    e.preventDefault();
    if (!emailCliente || !senhaCliente) return alert("Preencha e-mail e senha.");
    // depois: validar com Supabase
    navigate("/orcamento");
  };

  const entrarAdmin = (e) => {
    e.preventDefault();
    if (emailAdmin === ADMIN_EMAIL && senhaAdmin === ADMIN_SENHA) {
      setAdminOK(true);
    } else {
      alert("Credenciais do administrador inválidas.");
    }
  };

  const cadastrarCliente = (e) => {
    e.preventDefault();
    // depois: salvar no Supabase
    alert(`Cliente cadastrado:\n${JSON.stringify(novo, null, 2)}`);
    setNovo({ nome: "", email: "", senha: "", telefone: "" });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white rounded-[24px] shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Lado esquerdo (imagem/overlay) */}
          <div className="relative h-64 md:h-auto">
            <img
              src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1600&auto=format&fit=crop"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-emerald-800/60" />
            <div className="absolute inset-0 p-6 flex items-end">
              <div className="text-white/90">
                <img src="/Logo.png" alt="logo" className="h-16 opacity-90 mb-3" />
                <p className="text-sm">
                  © 2025 Art Emoldurados — todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>

          {/* Lado direito (form) */}
          <div className="p-8 md:p-10">
            {/* Toggle */}
            <div className="flex bg-slate-100 rounded-full p-1 w-[260px] ml-auto">
              <button
                onClick={() => setModo("cliente")}
                className={`flex-1 text-sm py-2 rounded-full transition ${
                  modo === "cliente"
                    ? "bg-white shadow text-emerald-700"
                    : "text-slate-500"
                }`}
              >
                Cliente
              </button>
              <button
                onClick={() => setModo("admin")}
                className={`flex-1 text-sm py-2 rounded-full transition ${
                  modo === "admin"
                    ? "bg-white shadow text-emerald-700"
                    : "text-slate-500"
                }`}
              >
                Administrador
              </button>
            </div>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                {modo === "cliente" ? (
                  <motion.div
                    key="cliente"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h1 className="text-2xl font-semibold text-emerald-900">
                      Entre na sua conta
                    </h1>
                    <p className="text-slate-600 text-sm">
                      Acompanhe pedidos e orçamentos.
                    </p>

                    <form onSubmit={entrarCliente} className="mt-6 space-y-4">
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">E-mail</label>
                        <input
                          value={emailCliente}
                          onChange={(e) => setEmailCliente(e.target.value)}
                          type="email"
                          className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Senha</label>
                        <input
                          value={senhaCliente}
                          onChange={(e) => setSenhaCliente(e.target.value)}
                          type="password"
                          className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl"
                      >
                        Entrar
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h1 className="text-2xl font-semibold text-emerald-900">
                      Acesso do Administrador
                    </h1>
                    <p className="text-slate-600 text-sm">
                      Use seu usuário interno para gerenciar cadastros.
                    </p>

                    {!adminOK && (
                      <form onSubmit={entrarAdmin} className="mt-6 space-y-4">
                        <div>
                          <label className="block text-sm text-slate-600 mb-1">E-mail</label>
                          <input
                            value={emailAdmin}
                            onChange={(e) => setEmailAdmin(e.target.value)}
                            type="email"
                            className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600 mb-1">Senha</label>
                          <input
                            value={senhaAdmin}
                            onChange={(e) => setSenhaAdmin(e.target.value)}
                            type="password"
                            className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl"
                        >
                          Entrar (admin)
                        </button>

                        <p className="text-xs text-slate-500">
                          Demo: <b>{ADMIN_EMAIL}</b> / <b>{ADMIN_SENHA}</b>
                        </p>
                      </form>
                    )}

                    {adminOK && (
                      <div className="mt-8">
                        <h2 className="text-lg font-medium text-emerald-900">
                          Cadastrar cliente
                        </h2>
                        <form onSubmit={cadastrarCliente} className="mt-4 grid gap-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-slate-600 mb-1">Nome</label>
                              <input
                                value={novo.nome}
                                onChange={(e) =>
                                  setNovo((n) => ({ ...n, nome: e.target.value }))
                                }
                                className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-600 mb-1">Telefone</label>
                              <input
                                value={novo.telefone}
                                onChange={(e) =>
                                  setNovo((n) => ({ ...n, telefone: e.target.value }))
                                }
                                className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-slate-600 mb-1">E-mail</label>
                              <input
                                type="email"
                                value={novo.email}
                                onChange={(e) =>
                                  setNovo((n) => ({ ...n, email: e.target.value }))
                                }
                                className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-600 mb-1">Senha</label>
                              <input
                                type="password"
                                value={novo.senha}
                                onChange={(e) =>
                                  setNovo((n) => ({ ...n, senha: e.target.value }))
                                }
                                className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setAdminOK(false)}
                              className="px-4 py-2 rounded-lg border hover:bg-slate-50"
                            >
                              Sair do modo admin
                            </button>
                            <button
                              type="submit"
                              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Salvar cliente
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
