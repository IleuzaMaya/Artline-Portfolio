// frontend/src/lib/env.js
export const env = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  FUNCTIONS_BASE:
    import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,
  ADMIN_API_TOKEN: import.meta.env.VITE_ADMIN_API_TOKEN,
  SITE_URL: import.meta.env.VITE_SITE_URL,
};
