// frontend/src/lib/edgeApi.js

import { FUNCTIONS_BASE } from "./env";

/**
 * Invoca Edge Function via HTTP fetch.
 * Retorna JSON quando sucesso.
 * Em erro, lança um objeto { status, payload, message }.
 */
async function invoke(functionName, body, init = {}) {
  const url = `${FUNCTIONS_BASE}/${functionName}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    body: body ? JSON.stringify(body) : "{}",
    ...init,
  });

  let payload;
  const text = await res.text();

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text || null;
  }

  if (!res.ok) {
    const msg =
      (payload && payload.error) ||
      (payload && payload.message) ||
      `Edge Function returned ${res.status}`;

    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

export const edgeApi = { invoke };
