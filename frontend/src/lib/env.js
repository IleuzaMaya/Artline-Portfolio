// frontend/src/lib/env.js

function cleanUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export const ENV = {
  SUPABASE_URL: cleanUrl(import.meta.env.VITE_SUPABASE_URL),
  SUPABASE_ANON_KEY: String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim(),
  FUNCTIONS_URL: cleanUrl(import.meta.env.VITE_SUPABASE_FUNCTIONS_URL), // opcional
  ADMIN_API_TOKEN: String(import.meta.env.VITE_ADMIN_API_TOKEN || "").trim(),
  SITE_URL: cleanUrl(import.meta.env.VITE_SITE_URL || window.location.origin),
};

export const FUNCTIONS_BASE = ENV.FUNCTIONS_URL
  ? ENV.FUNCTIONS_URL
  : `${ENV.SUPABASE_URL}/functions/v1`;

export function assertEnv() {
  if (!ENV.SUPABASE_URL) throw new Error("VITE_SUPABASE_URL não configurado");
  if (!ENV.SUPABASE_ANON_KEY) throw new Error("VITE_SUPABASE_ANON_KEY não configurado");
}
