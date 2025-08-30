// frontend/src/lib/edgeApi.js
import axios from "axios";

const baseURL = (
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.replace(/\/$/, "") ||
  import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")?.replace(".supabase.co", ".functions.supabase.co")
);

const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const edge = axios.create({
  baseURL,
  headers: {
    Authorization: `Bearer ${anon}`,
    apikey: anon,
    "Content-Type": "application/json",
  },
});
