const BASE = import.meta.env.VITE_FUNCTIONS_BASE;
const TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN;

async function post(path: string, body: unknown) {
  if (!BASE || !TOKEN) throw new Error("Env VITE_FUNCTIONS_BASE / VITE_ADMIN_API_TOKEN ausentes");
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": TOKEN,
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

export const adminApi = {
  createClient: (p: { email: string; name: string; password?: string }) =>
    post("admin-create-client", p),

  listAccounts: (p: { page?: number; perPage?: number; q?: string; role?: string; ativo?: boolean }) =>
    post("admin-list-accounts", p),

  setAccess: (p: { email: string; ativo?: boolean; role?: "admin"|"cliente" }) =>
    post("admin-set-access", p),

  resetPassword: (p: { email: string; redirectTo?: string }) =>
    post("admin-reset-password", p),
};
