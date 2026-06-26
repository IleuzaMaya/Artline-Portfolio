// frontend/src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";
import { ENV, assertEnv } from "../config/env";

assertEnv();

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
