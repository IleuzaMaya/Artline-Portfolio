// frontend/src/App.jsx
// frontend/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";

import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Orcamento from "./pages/Orcamento.jsx";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-center">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/orcamento"
          element={
            <ProtectedRoute>
              <Orcamento />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
