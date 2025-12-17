// frontend/src/lib/env.js

function trimSlash(v) {
  return String(v || "").replace(/\/+$/, "");
}

export const SUPABASE_URL = trimSlash(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// ✅ Base única das Edge Functions
// Preferimos VITE_SUPABASE_FUNCTIONS_URL (quando você define no Vercel)
// Formato esperado: https://<project-ref>.functions.supabase.co
const explicitFn = trimSlash(import.meta.env.VITE_SUPABASE_FUNCTIONS_URL);

function guessFunctionsBaseFromProjectUrl(projectUrl) {
  // Ex: https://xxxx.supabase.co  -> https://xxxx.functions.supabase.co
  if (!projectUrl) return "";
  return trimSlash(String(projectUrl).replace(".supabase.co", ".functions.supabase.co"));
}

export const FUNCTIONS_BASE =
  explicitFn || guessFunctionsBaseFromProjectUrl(SUPABASE_URL);

export const ADMIN_API_TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN || "";

export function assertEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("VITE_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("VITE_SUPABASE_ANON_KEY");
  if (!FUNCTIONS_BASE) missing.push("VITE_SUPABASE_FUNCTIONS_URL (ou derivável da URL)");
  if (!ADMIN_API_TOKEN) missing.push("VITE_ADMIN_API_TOKEN");

  if (missing.length) {
    throw new Error(`Env ausentes: ${missing.join(", ")}`);
  }
}
