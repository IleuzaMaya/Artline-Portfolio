// frontend/src/lib/edgeApi.js
import axios from "axios";

const URL =
  (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.replace(/\/$/, "")) ||
  (import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")?.replace(".supabase.co", ".functions.supabase.co"));

const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const edge = axios.create({
  baseURL: URL,
  headers: {
    Authorization: `Bearer ${ANON}`,
    apikey: ANON,
  },
});
