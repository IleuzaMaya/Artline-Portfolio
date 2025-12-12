// frontend/src/lib/adminApi.js
import { supabase } from "../lib/supabase";

const BASE = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
const TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN;

async function call(name, body = {}) {
  if (!BASE || !TOKEN) {
    throw new Error(
      "Env VITE_SUPABASE_FUNCTIONS_URL / VITE_ADMIN_API_TOKEN ausentes"
    );
  }

  const {
    data: { session } = {},
  } = await supabase.auth.getSession();
  const jwt = session?.access_token;

  const url = `${BASE}/${name}?_=${Date.now()}`;
  console.log("adminApi.call →", name, "URL:", url, "BODY:", body);

  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": TOKEN,
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
    console.error(
      `Edge Function ${name} erro (status ${res.status}):`,
      data || text
    );
    const msg =
      (data && (data.error || data.message)) ||
      text ||
      "Edge Function returned a non-2xx status code";
    throw new Error(msg);
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
