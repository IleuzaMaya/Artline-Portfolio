// frontend/src/lib/env.js

export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // Se você usa base custom, mantenha. Se não, pode deixar vazio.
  FUNCTIONS_BASE: import.meta.env.VITE_SUPABASE_FUNCTIONS_URL, // opcional

  // Token admin (vai no header x-admin-token)
  ADMIN_API_TOKEN: import.meta.env.VITE_ADMIN_API_TOKEN,

  SITE_URL: import.meta.env.VITE_SITE_URL || "https://app.artline.com.br",
};

// ✅ Compat: alguns arquivos importavam { env }
export const env = ENV;

export function assertEnv() {
  const missing = [];
  if (!ENV.SUPABASE_URL) missing.push("VITE_SUPABASE_URL");
  if (!ENV.SUPABASE_ANON_KEY) missing.push("VITE_SUPABASE_ANON_KEY");
  if (!ENV.ADMIN_API_TOKEN) missing.push("VITE_ADMIN_API_TOKEN");

  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}
