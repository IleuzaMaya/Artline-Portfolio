// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoginPage from "./pages/Login.jsx";
import OrcamentoForm from "./pages/Orcamento.jsx";
import AdminPage from "./pages/Admin.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-center">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-center">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.user_metadata?.role !== "admin") {
    // se não for admin, joga para orçamento (ou /login)
    return <Navigate to="/orcamento" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset" element={<ResetPassword />} />
          <Route
            path="/orcamento"
            element={
              <ProtectedRoute>
                <OrcamentoForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
