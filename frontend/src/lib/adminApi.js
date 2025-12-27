// frontend/src/lib/adminApi.js
import { invoke } from "./edgeApi";
import { ENV } from "./env";

export const adminApi = {
  createClient(payload) {
    return invoke("admin-create-client", payload, {
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    });
  },

  updateClient(payload) {
    return invoke("admin-update-client", payload, {
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    });
  },

  listAccounts() {
    return invoke("admin-list-accounts", {}, {
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    });
  },

  resetPassword(payload) {
    return invoke("admin-reset-password", payload, {
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    });
  },

  setAccess(payload) {
    return invoke("admin-set-access", payload, {
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    });
  },
};
