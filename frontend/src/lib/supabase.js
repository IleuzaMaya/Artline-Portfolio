// frontend/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const url   = import.meta.env.VITE_SUPABASE_URL;
const key   = import.meta.env.VITE_SUPABASE_ANON_KEY;
const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
  functions: { url: fnUrl }, // <- importante!
});
