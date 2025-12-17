// frontend/src/lib/adminApi.js
import { supabase } from "./supabase";
import { FUNCTIONS_BASE, ADMIN_API_TOKEN } from "./env";

async function call(name, body = {}) {
  if (!FUNCTIONS_BASE || !ADMIN_API_TOKEN) {
    throw new Error("Env VITE_SUPABASE_FUNCTIONS_URL / VITE_ADMIN_API_TOKEN ausentes");
  }

  const { data: { session } = {} } = await supabase.auth.getSession();
  const jwt = session?.access_token;

  const url = `${FUNCTIONS_BASE}/${name}?_=${Date.now()}`;

  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_API_TOKEN,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      text ||
      "Edge Function returned a non-2xx status code";

    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data ?? {};
}

export const adminApi = {
  updateClient: (p) => call("admin-update-client", p),
  createClient: (p) => call("admin-create-client", p),
  listAccounts: (p) => call("admin-list-accounts", p),
  setAccess: (p) => call("admin-set-access", p),
  resetPassword: (p) => call("admin-reset-password", p),
  setPassword: (p) => call("admin-set-password", p),
};
