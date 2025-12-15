// frontend/src/lib/env.js

function stripSlash(v = "") {
  return String(v || "").trim().replace(/\/+$/, "");
}

/**
 * Fonte única da verdade para Edge Functions.
 *
 * Recomendação: setar VITE_SUPABASE_FUNCTIONS_URL como:
 *   https://SEU-PROJETO.supabase.co/functions/v1
 */
export function getFunctionsBase() {
  const explicit = stripSlash(import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || "");
  if (explicit) return explicit;

  const supa = stripSlash(import.meta.env.VITE_SUPABASE_URL || "");
  if (!supa) return "";

  return `${supa}/functions/v1`;
}

export const FUNCTIONS_BASE = getFunctionsBase();

export const ADMIN_TOKEN = String(import.meta.env.VITE_ADMIN_API_TOKEN || "");
export const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || "");
export const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "");
