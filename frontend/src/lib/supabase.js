// frontend/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const baseUrl = import.meta.env.VITE_SUPABASE_URL;                // https://nwtfynwrmhggbeudwpus.supabase.co
const explicitFn = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;   // https://nwtfynwrmhggbeudwpus.functions.supabase.co

const functionsUrl =
  (explicitFn && explicitFn.replace(/\/$/, '')) ||
  (baseUrl && baseUrl.replace('.supabase.co', '.functions.supabase.co'));

export const supabase = createClient(baseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  functions: { url: functionsUrl },
  global: { headers: { 'x-client-info': 'art-emoldurados-webapp' } },
});

if (typeof window !== 'undefined') console.log('[FN URL]', functionsUrl);
