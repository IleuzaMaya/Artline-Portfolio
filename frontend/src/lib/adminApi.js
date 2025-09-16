//frontend/src/lib/adminApi.js

export const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN;

async function call(name, body = {}) {
  if (!FUNCTIONS_URL || !ADMIN_TOKEN) {
    throw new Error("Env VITE_SUPABASE_FUNCTIONS_URL / VITE_ADMIN_API_TOKEN ausentes");
  }
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Edge Function returned a non-2xx status code");
  return data;
}

export const adminApi = {
  listAccounts: (opts) => call("admin-list-accounts", opts),
  createClient:  (payload) => call("admin-create-client", payload),
  setAccess:     (payload) => call("admin-set-access", payload),
  resetPassword: (payload) => call("admin-reset-password", payload),
};
