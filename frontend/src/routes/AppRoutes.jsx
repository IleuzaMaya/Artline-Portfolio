// frontend/src/routes/AppRoutes.jsx
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import OrcamentoForm from "../pages/Orcamento.jsx";
import AuthSplit from "../components/AuthSplit.jsx";
import ResetPassword from "../pages/ResetPassword.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import Admin from "../pages/Admin.jsx";          // <- importe aqui

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null; // pode renderizar spinner se quiser
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?next=${next}`} replace />;
  }
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* públicas */}
      <Route path="/" element={<AuthSplit />} />
      <Route path="/reset" element={<ResetPassword />} />

      {/* protegidas */}
      <Route element={<RequireAuth />}>
        <Route path="/orcamento" element={<OrcamentoForm />} />
        <Route path="/admin" element={<Admin />} />      {/* <- AQUI */}
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
