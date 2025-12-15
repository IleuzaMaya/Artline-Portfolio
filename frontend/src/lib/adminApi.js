// frontend/src/lib/adminApi.js
import { supabase } from "./supabase";
import { ADMIN_TOKEN, FUNCTIONS_BASE } from "./env";

function normalizeInvokeError(err) {
  // A lib do Supabase pode trazer status/context variando por versão.
  // Vamos padronizar para o Admin.jsx usar:
  //   err.status === 409
  //   err.payload.code === "EMAIL_ALREADY_EXISTS"
  const msg =
    err?.message ||
    err?.context?.message ||
    "Edge Function returned a non-2xx status code";

  const e = new Error(msg);

  // tenta extrair status
  e.status =
    err?.status ||
    err?.context?.status ||
    err?.context?.response?.status ||
    500;

  // tenta extrair payload/body
  e.payload =
    err?.context?.body ||
    err?.context?.data ||
    err?.context ||
    null;

  return e;
}

async function call(name, body = {}) {
  if (!FUNCTIONS_BASE || !ADMIN_TOKEN) {
    throw new Error(
      "Env VITE_SUPABASE_FUNCTIONS_URL / VITE_ADMIN_API_TOKEN ausentes"
    );
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: {
      "x-admin-token": ADMIN_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (error) {
    throw normalizeInvokeError(error);
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
