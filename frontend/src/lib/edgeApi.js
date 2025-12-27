// frontend/src/lib/edgeApi.js

import { supabase } from "./supabase";
import { env } from "./env";

async function getAuthHeaders(extra = {}) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;

  return {
    "Content-Type": "application/json",
    apikey: env.SUPABASE_ANON_KEY,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extra,
  };
}

async function request(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${env.FUNCTIONS_BASE}/${path}`, {
    method,
    headers: await getAuthHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
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

export const edge = { request };
