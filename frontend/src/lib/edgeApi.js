// frontend/src/lib/edgeApi.js
import { supabase } from "./supabase";
import { env } from "./env";

async function request(fn, { method = "POST", body } = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const headers = {
    "Content-Type": "application/json",
  };

  // ✅ precisa disso para as funções que checam o usuário logado
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  // ✅ para funções “admin”
  if (env.ADMIN_API_TOKEN) headers["x-admin-token"] = env.ADMIN_API_TOKEN;

  const res = await fetch(`${env.FUNCTIONS_BASE}/${fn}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text || null;
  }

  if (!res.ok) {
    const err = new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

export const edge = {
  request,
};


