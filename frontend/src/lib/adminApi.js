// frontend/src/lib/adminApi.js
import { edge } from "./edgeApi";
import { ENV } from "../config/env";

export const adminApi = {
  createClient(payload) {
    return edge.invoke("admin-create-client", payload, {
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    });
  },
  updateClient(payload) {
    return edge.invoke("admin-update-client", payload, {
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    });
  },
  listAccounts() {
    return edge.invoke("admin-list-accounts", {}, {
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    });
  },
  resetPassword(payload) {
    return edge.invoke("admin-reset-password", payload, {
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    });
  },
  setAccess(payload) {
    return edge.invoke("admin-set-access", payload, {
      "x-admin-token": ENV.ADMIN_API_TOKEN,
    });
  },
};
