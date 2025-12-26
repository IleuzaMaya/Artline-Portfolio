// frontend/src/lib/edgeApi.js
import { FUNCTIONS_BASE, ENV } from "./env";

async function readJsonSafe(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

function makeError(res, payload) {
  const msg =
    payload?.error ||
    payload?.message ||
    payload?.raw ||
    `Edge Function returned a non-2xx status code (${res.status})`;
  const err = new Error(msg);
  err.status = res.status;
  err.payload = payload;
  return err;
}

async function post(fnName, body) {
  const url = `${FUNCTIONS_BASE}/${fnName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // aqui normalmente NÃO precisa x-admin-token, mas deixo opcional:
      ...(ENV.ADMIN_API_TOKEN ? { "x-admin-token": ENV.ADMIN_API_TOKEN } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });

  const payload = await readJsonSafe(res);
  if (!res.ok) throw makeError(res, payload);
  return payload;
}

/**
 * Compat: seu Orcamento.jsx estava importando:
 *   import { edge as api } from '../lib/edgeApi';
 * Então exportamos "edge" aqui.
 */
export const edge = {
  catalogo(payload) {
    return post("catalogo", payload);
  },
  ping(payload) {
    return post("ping", payload);
  },
};

// Também exporto um alias mais “claro”, se você quiser usar depois:
export const edgeApi = edge;
