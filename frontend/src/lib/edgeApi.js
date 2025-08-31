// frontend/src/lib/edgeApi.js
import axios from "axios";

function buildBase() {
  const fnUrl = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || "").replace(/\/$/, "");
  if (fnUrl) return fnUrl; // já veio pronto do env

  const supa = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  if (!supa) return "";

  // Usa o formato oficial ...supabase.co/functions/v1
  return `${supa}/functions/v1`;
}

const base = buildBase();
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const edge = axios.create({
  baseURL: `${base}/catalogo`,
  headers: {
    Authorization: `Bearer ${anon}`,
    apikey: anon,
    "Content-Type": "application/json",
  },
});
