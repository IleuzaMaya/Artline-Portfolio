// frontend/src/lib/edgeApi.js
import axios from "axios";

const baseURL = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const edge = axios.create({
  baseURL,
  headers: {
    Authorization: `Bearer ${anon}`,
    apikey: anon,
    "Content-Type": "application/json",
  },
});
