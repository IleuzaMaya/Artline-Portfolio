// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// importa seus estilos globais (Tailwind e customizações)
import "./App.css";

import Admin from "./pages/Admin.jsx";
import Orcamento from "./pages/Orcamento.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Login from "./pages/Login.jsx";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/orcamento" element={<Orcamento />} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route path="*" element={<div style={{ padding: 24 }}>Página não encontrada.</div>} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
