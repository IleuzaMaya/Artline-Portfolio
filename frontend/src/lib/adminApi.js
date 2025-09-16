// frontend/src/lib/adminApi.js
const BASE = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
const TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN;

async function call(name, body = {}) {
  if (!BASE || !TOKEN) throw new Error("Env VITE_SUPABASE_FUNCTIONS_URL / VITE_ADMIN_API_TOKEN ausentes");
  const res = await fetch(`${BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": TOKEN,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Edge Function returned a non-2xx status code");
  return data;
}

export const adminApi = {
  createClient: (p) => call("admin-create-client", p),
  listAccounts: (p) => call("admin-list-accounts", p),
  setAccess:   (p) => call("admin-set-access", p),
  resetPassword: (p) => call("admin-reset-password", p),
};
