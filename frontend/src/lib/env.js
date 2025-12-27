// frontend/src/lib/env.js

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Base das Edge Functions (ex: https://xxxx.supabase.co/functions/v1)
export const FUNCTIONS_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
  `${SUPABASE_URL}/functions/v1`;

export const ADMIN_API_TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN;
export const SITE_URL = import.meta.env.VITE_SITE_URL;

// ✅ compat: quem importar { env } continua funcionando
export const env = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  FUNCTIONS_BASE: import.meta.env.VITE_SUPABASE_FUNCTIONS_URL, // ou monte com SUPABASE_URL
  ADMIN_API_TOKEN: import.meta.env.VITE_ADMIN_API_TOKEN,
  SITE_URL: import.meta.env.VITE_SITE_URL,
};

