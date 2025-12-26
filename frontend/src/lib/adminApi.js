// frontend/src/lib/adminApi.js
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
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    },
    body: JSON.stringify(body ?? {}),
  });

  const payload = await readJsonSafe(res);
  if (!res.ok) throw makeError(res, payload);
  return payload;
}

export const adminApi = {
  createClient(payload) {
    return post("admin-create-client", payload);
  },
  updateClient(payload) {
    return post("admin-update-client", payload);
  },
  listAccounts(payload) {
    return post("admin-list-accounts", payload);
  },
  resetPassword(payload) {
    return post("admin-reset-password", payload);
  },
  setAccess(payload) {
    return post("admin-set-access", payload);
  },
};
