// frontend/src/lib/edgeApi.js
import axios from "axios";
import { FUNCTIONS_BASE, SUPABASE_ANON_KEY } from "./env";

if (!FUNCTIONS_BASE) {
  console.warn("[edgeApi] FUNCTIONS_BASE vazio. Verifique VITE_SUPABASE_FUNCTIONS_URL.");
}

export const edge = axios.create({
  baseURL: `${FUNCTIONS_BASE}/catalogo`,
  headers: {
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  },
});
