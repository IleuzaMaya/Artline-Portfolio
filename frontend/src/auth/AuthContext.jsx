// frontend/src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub;

    async function init() {
      setLoading(true);
      // pega sessão atual (ex.: após login) antes de renderizar rota protegida
      const { data: { session } = {} } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      // escuta mudanças de auth
      const sub = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });
      unsub = () => sub.data.subscription.unsubscribe();
    }

    init();
    return () => unsub?.();
  }, []);

  const value = { user, loading };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
