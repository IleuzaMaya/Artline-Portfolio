import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./App.css"; // troquei index.css por App.css
import App from "./OrcamentoForm.jsx";
import './index.css';


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
