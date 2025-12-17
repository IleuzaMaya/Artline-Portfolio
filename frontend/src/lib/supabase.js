// frontend/src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, FUNCTIONS_BASE } from "./env";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  functions: { url: FUNCTIONS_BASE },
  global: { headers: { "x-client-info": "art-emoldurados-webapp" } },
});

if (typeof window !== "undefined") {
  console.log("[ENV] SUPABASE_URL:", SUPABASE_URL);
  console.log("[ENV] FUNCTIONS_BASE:", FUNCTIONS_BASE);
}
