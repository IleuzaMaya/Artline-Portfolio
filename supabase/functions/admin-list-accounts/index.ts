import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGINS = ["https://app.artemoldurados.com.br", "http://localhost:5173"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": (o && ORIGINS.includes(o)) ? o : ORIGINS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, x-admin-token, content-type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });

  try {
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return new Response(JSON.stringify({ error: "Missing secrets" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" }});
    }

    const token = req.headers.get("x-admin-token") ?? "";
    if (token !== ADMIN_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...headers, "Content-Type": "application/json" }});
    }

    const { page = 1, perPage = 50, q = "", role, ativo } = await req.json().catch(() => ({}));
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: usersPage, error: listErr } = await sb.auth.admin.listUsers({ page, perPage });
    if (listErr) throw listErr;

    let users = usersPage?.users ?? [];
    if (q) {
      const qq = String(q).toLowerCase();
      users = users.filter(u =>
        u.email?.toLowerCase().includes(qq) ||
        String(u.user_metadata?.name ?? "").toLowerCase().includes(qq)
      );
    }

    const emails = users.map(u => u.email!).filter(Boolean);
    const ids    = users.map(u => u.id);

    const [acc, prof, cli] = await Promise.all([
      sb.from("acessos_permitidos").select("email,role,ativo").in("email", emails),
      sb.from("profiles").select("id,nome,tipo").in("id", ids),
      sb.from("clientes").select("id,email,nome,segmento,empresa").in("email", emails),
    ]);
    if (acc.error)  throw acc.error;
    if (prof.error) throw prof.error;
    if (cli.error)  throw cli.error;

    const accByEmail = new Map((acc.data ?? []).map(r => [r.email, r]));
    const profById   = new Map((prof.data ?? []).map(r => [r.id, r]));
    const cliByEmail = new Map((cli.data ?? []).map(r => [r.email, r]));

    let rows = users.map(u => {
      const a = accByEmail.get(u.email ?? "") || null;
      const p = profById.get(u.id) || null;
      const c = cliByEmail.get(u.email ?? "") || null;
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        nome: p?.nome ?? u.user_metadata?.name ?? c?.nome ?? null,
        role: a?.role ?? p?.tipo ?? null,
        ativo: a?.ativo ?? null,
        cliente: { empresa: c?.empresa ?? null, segmento: c?.segmento ?? null },
      };
    });

    if (role) rows = rows.filter(r => (r.role || "").toLowerCase() === String(role).toLowerCase());
    if (typeof ativo === "boolean") rows = rows.filter(r => r.ativo === ativo);

    return new Response(JSON.stringify({ page, perPage, count: rows.length, rows }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-list-accounts:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" }
    });
  }
});
