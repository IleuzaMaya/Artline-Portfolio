// frontend/src/routes/AppRoutes.jsx

import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import OrcamentoForm from "../pages/Orcamento.jsx";
import Login from "../pages/Login.jsx"; // ajuste o caminho se for diferente

function getToken() {
  try {
    const ls =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token");
    if (ls) return ls;
    const m = document.cookie.match(
      /(?:^|;\s*)(?:token|auth_token|session|edge_session)=([^;]+)/
    );
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function RequireAuth() {
  const location = useLocation();
  const token = getToken();
  if (!token) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/orcamento" replace />} />
        <Route path="/orcamento" element={<OrcamentoForm />} />
      </Route>
      <Route path="*" element={<Navigate to="/orcamento" replace />} />
    </Routes>
  );
}
