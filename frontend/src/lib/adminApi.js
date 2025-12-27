// frontend/src/lib/adminApi.js
import { supabase } from "./supabase";
import { env } from "./env";

async function headersAdmin() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;

  return {
    "Content-Type": "application/json",
    apikey: env.SUPABASE_ANON_KEY,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    "x-admin-token": env.ADMIN_API_TOKEN,
  };
}

async function post(fnName, body) {
  const res = await fetch(`${env.FUNCTIONS_BASE}/${fnName}`, {
    method: "POST",
    headers: await headersAdmin(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }

  if (!res.ok) {
    const err = new Error(payload?.error || payload?.message || "Erro na Edge Function");
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

export const adminApi = {
  createClient: (payload) => post("admin-create-client", payload),
  // ...
};
