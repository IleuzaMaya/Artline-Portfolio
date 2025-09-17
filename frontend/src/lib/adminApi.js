// frontend/src/lib/adminApi.js
import { supabase } from "../lib/supabase";

const BASE = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
const TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN;

async function call(name, body = {}) {
  if (!BASE || !TOKEN) throw new Error("Env VITE_SUPABASE_FUNCTIONS_URL / VITE_ADMIN_API_TOKEN ausentes");
  const { data: { session } = {} } = await supabase.auth.getSession();
  const jwt = session?.access_token;

  const res = await fetch(`${BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": TOKEN,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Edge Function returned a non-2xx status code");
  return data;
}

export const adminApi = {
  async updateClient(payload) {
    const { data, error } = await supabase.functions.invoke("admin-update-client", {
      body: payload,
      headers: { "x-admin-token": import.meta.env.VITE_ADMIN_API_TOKEN },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  createClient: (p) => call("admin-create-client", p),
  listAccounts: (p) => call("admin-list-accounts", p),
  setAccess:   (p) => call("admin-set-access", p),
  resetPassword: (p) => call("admin-reset-password", p),
  setPassword:   (p) => call("admin-set-password", p), 

};
