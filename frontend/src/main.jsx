// frontend/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import "./index.css";

import App from "./App.jsx"; // agora puxa o App centralizador

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
