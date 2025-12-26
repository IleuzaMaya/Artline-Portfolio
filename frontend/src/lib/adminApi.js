// frontend/src/lib/adminApi.js
import { edgeApi } from "./edgeApi";
import { ADMIN_API_TOKEN } from "./env";

function withAdminToken(headers = {}) {
  return {
    ...headers,
    "x-admin-token": ADMIN_API_TOKEN,
  };
}

async function createClient(payload) {
  // ✅ IMPORTANTÍSSIMO: recebe payload por parâmetro
  return edgeApi.invoke("admin-create-client", payload, {
    headers: withAdminToken(),
  });
}

async function updateClient(payload) {
  return edgeApi.invoke("admin-update-client", payload, {
    headers: withAdminToken(),
  });
}

async function resetPassword(payload) {
  return edgeApi.invoke("admin-reset-password", payload, {
    headers: withAdminToken(),
  });
}

async function listAccounts(payload = {}) {
  return edgeApi.invoke("admin-list-accounts", payload, {
    headers: withAdminToken(),
  });
}

async function setAccess(payload) {
  return edgeApi.invoke("admin-set-access", payload, {
    headers: withAdminToken(),
  });
}

export const adminApi = {
  createClient,
  updateClient,
  resetPassword,
  listAccounts,
  setAccess,
};
