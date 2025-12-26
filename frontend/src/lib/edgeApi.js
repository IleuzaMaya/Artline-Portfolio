// frontend/src/lib/edgeApi.js
import { FUNCTIONS_BASE } from "./env";
import { supabase } from "./supabase";

// helper: tenta ler JSON, mas não explode se vier vazio/HTML
async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

async function getAuthHeaders(extraHeaders = {}) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;

  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extraHeaders,
  };
}

async function invoke(functionName, body, extraHeaders = {}) {
  const url = `${FUNCTIONS_BASE}/${functionName}`;
  const headers = await getAuthHeaders(extraHeaders);

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const payload = await safeJson(res);

  if (!res.ok) {
    // erro padronizado p/ o frontend
    const err = new Error(payload?.error || `Edge Function returned ${res.status}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

// ✅ export que o Orcamento.jsx espera:
export const edge = {
  invoke,
};

// (opcional) default export também, se quiser usar "import api from ..."
export default edge;
