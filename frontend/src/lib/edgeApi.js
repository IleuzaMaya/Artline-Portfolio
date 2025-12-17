// frontend/src/lib/edgeApi.js
import axios from "axios";
import { FUNCTIONS_BASE, SUPABASE_ANON_KEY } from "./env";

export const edge = axios.create({
  baseURL: `${FUNCTIONS_BASE}/catalogo`,
  headers: {
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  },
});
