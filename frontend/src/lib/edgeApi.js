// frontend/src/lib/edgeApi.js
import axios from "axios";
import { ENV } from "./env";

function buildFunctionsBase() {
  // 1) Se você definiu VITE_SUPABASE_FUNCTIONS_URL, usa ele como fonte da verdade
  const explicit = (ENV.FUNCTIONS_BASE || "").replace(/\/$/, "");
  if (explicit) return explicit;

  // 2) Fallback: deriva de VITE_SUPABASE_URL
  const supa = (ENV.SUPABASE_URL || "").replace(/\/$/, "");
  if (!supa) return "";

  return `${supa}/functions/v1`;
}

const functionsBase = buildFunctionsBase();
const anon = ENV.SUPABASE_ANON_KEY;

// ✅ O Orcamento.jsx importa assim:  import { edge as api } from '../lib/edgeApi';
export const edge = axios.create({
  baseURL: `${functionsBase}/catalogo`,
  headers: {
    Authorization: `Bearer ${anon}`,
    apikey: anon,
    "Content-Type": "application/json",
  },
});
