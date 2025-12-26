// frontend/src/lib/edgeApi.js
import { supabase } from './supabase';
import { env } from './env';

async function request(fn, options = {}) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;

  if (!accessToken) {
    throw new Error('Missing authorization header');
  }

  const res = await fetch(`${env.FUNCTIONS_BASE}/${fn}`, {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'x-admin-token': env.ADMIN_API_TOKEN,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(payload?.error || 'Request failed');
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

export const edgeApi = {
  listAccounts: () => request('admin-list-accounts', { method: 'GET' }),
  createClient: (payload) =>
    request('admin-create-client', { body: payload }),
  updateClient: (payload) =>
    request('admin-update-client', { body: payload }),
  resetPassword: (email) =>
    request('admin-reset-password', { body: { email } }),
};
