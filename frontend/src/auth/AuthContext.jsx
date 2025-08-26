//frontend/src/auth/AuthContext.jsx

import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Importa Supabase só se existir (para não quebrar no demo)
let supabase = null;
try {
  // opcional: se não existir esse arquivo, o catch evita erro
  supabase = (await import("../lib/supabase.js")).default;
} catch {}

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Se houver Supabase, tenta pegar sessão
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      if (!supabase) {
        // modo demo: restaura do localStorage
        const raw = localStorage.getItem("demo_user");
        if (raw) setUser(JSON.parse(raw));
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user ?? null);
      setLoading(false);

      const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
        setUser(sess?.user ?? null);
      });
      unsub = sub?.subscription?.unsubscribe || (() => {});
    })();
    return () => unsub();
  }, []);

  const login = async (email, password) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user);
      return;
    }
    // MODO DEMO (sem Supabase): qualquer email/senha entram
    const demo = { id: "demo", email };
    localStorage.setItem("demo_user", JSON.stringify(demo));
    setUser(demo);
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem("demo_user");
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout, loading }), [user, loading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
