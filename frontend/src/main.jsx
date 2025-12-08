// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Páginas existentes no seu projeto
import Admin from "./pages/Admin.jsx";
import Orcamento from "./pages/Orcamento.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Login from "./pages/Login.jsx";

// (opcional) estilos globais, se você tiver um index.css
// import "./index.css";

function AppRoutes() {
  return (
    <Routes>
      {/* Raiz direciona para login (ajuste se quiser) */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/orcamento" element={<Orcamento />} />
      <Route path="/reset" element={<ResetPassword />} />

      {/* 404 básica */}
      <Route path="*" element={<div style={{ padding: 24 }}>Página não encontrada.</div>} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
