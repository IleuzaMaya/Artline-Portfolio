// frontend/src/lib/env.js

function stripTrailingSlash(v) {
  return String(v || "").replace(/\/$/, "");
}

export const SUPABASE_URL = stripTrailingSlash(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Preferir explícito; senão cair no padrão oficial: https://xxx.supabase.co/functions/v1
export const FUNCTIONS_BASE =
  stripTrailingSlash(import.meta.env.VITE_SUPABASE_FUNCTIONS_URL) ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "");

export const ADMIN_API_TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN || "";

// Debug opcional
if (typeof window !== "undefined") {
  console.log("[ENV] SUPABASE_URL:", SUPABASE_URL);
  console.log("[ENV] FUNCTIONS_BASE:", FUNCTIONS_BASE);
}
