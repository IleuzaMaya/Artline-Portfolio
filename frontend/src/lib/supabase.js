// frontend/src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";
import { FUNCTIONS_BASE, SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // não quebra build, mas deixa explícito no console
  console.warn("[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { "x-client-info": "art-emoldurados-webapp" } },
  functions: { url: FUNCTIONS_BASE }, // ✅ base única
});

if (typeof window !== "undefined") {
  console.log("[FUNCTIONS_BASE]", FUNCTIONS_BASE);
}
