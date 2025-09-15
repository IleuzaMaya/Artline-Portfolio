// frontend/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,          // https://<proj>.supabase.co
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    functions: {
      // 👇 Obrigatório: use o host "functions.supabase.co"
      url: import.meta.env.VITE_SUPABASE_FUNCTIONS_URL, // https://<proj>.functions.supabase.co
    },
    global: {
      headers: {
        // opcional: bom para logs/diagnóstico
        'x-client-info': 'art-emoldurados-webapp',
      },
    },
  }
);
