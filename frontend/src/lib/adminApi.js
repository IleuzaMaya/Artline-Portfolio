// frontend/src/lib/adminApi.js
import { edge } from "./edgeApi";

export const adminApi = {
  createClient(payload) {
    return edge.invoke("admin-create-client", payload);
  },
  updateClient(payload) {
    return edge.invoke("admin-update-client", payload);
  },
  listAccounts(payload) {
    return edge.invoke("admin-list-accounts", payload || {});
  },
  resetPassword(payload) {
    return edge.invoke("admin-reset-password", payload);
  },
  setAccess(payload) {
    return edge.invoke("admin-set-access", payload);
  },
};
