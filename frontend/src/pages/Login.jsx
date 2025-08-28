// frontend/src/pages/Login.jsx
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AuthSplit from "../components/AuthSplit";

export default function LoginPage() {
  const navigate = useNavigate();

  // Chamado pelo AuthSplit quando o login dá certo
  const handleAuth = async ({ user }) => {
    if (!user) return;
    const email = user.email;

    // Consulta tabela de permissões para saber se é admin
    const { data: perm } = await supabase
      .from("acessos_permitidos")
      .select("role, ativo")
      .eq("email", email)
      .maybeSingle();

    if (perm?.role === "admin" && perm?.ativo) {
      navigate("/admin", { replace: true });
    } else {
      navigate("/orcamento", { replace: true });
    }
  };

  return <AuthSplit onAuth={handleAuth} />;
}
