// frontend/src/lib/adminApi.js
import { edge } from "./edgeApi";
import { ADMIN_API_TOKEN } from "./env";

function withAdminToken(headers = {}) {
  // Edge Functions exigem x-admin-token (seu padrão)
  return {
    ...headers,
    ...(ADMIN_API_TOKEN ? { "x-admin-token": ADMIN_API_TOKEN } : {}),
  };
}

export const adminApi = {
  // cria/convite
  async createClient(payload) {
    return edge.invoke("admin-create-client", payload, withAdminToken());
  },

  // lista contas (clientes/admins)
  async listAccounts(payload = {}) {
    return edge.invoke("admin-list-accounts", payload, withAdminToken());
  },

  // reset password link
  async resetPassword(payload) {
    return edge.invoke("admin-reset-password", payload, withAdminToken());
  },

  // atualizar cliente
  async updateClient(payload) {
    return edge.invoke("admin-update-client", payload, withAdminToken());
  },

  // setar acesso/ativar/desativar (se você usa)
  async setAccess(payload) {
    return edge.invoke("admin-set-access", payload, withAdminToken());
  },
};
