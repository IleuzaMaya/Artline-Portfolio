// supabase/functions/admin-list-accounts/index.ts
/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headersBase = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headersBase, "Content-Type": "application/json" },
  });
}

function normEmail(v: any) {
  return String(v || "").trim().toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headersBase });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    // ✅ secrets
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";

    const SERVICE_ROLE =
      Deno.env.get("SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return json(500, { error: "Missing secrets" });
    }

    // ✅ auth do admin (token do Vercel)
    const adminToken = req.headers.get("x-admin-token") || "";
    if (adminToken !== ADMIN_API_TOKEN) {
      return json(401, { error: "Unauthorized" });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // body opcional (no seu front você manda {})
    const payload = await req.json().catch(() => ({} as any));
    const includeDeleted = !!payload?.includeDeleted;

    // 1) acessos_permitidos (enxuto)
    const { data: acessos, error: errAcessos } = await sb
      .from("acessos_permitidos")
      .select("email, role, ativo, is_primary_admin, is_deleted, created_at")
      .eq("is_deleted", includeDeleted ? (true as any) : false);

    if (errAcessos) throw errAcessos;

    // 2) clientes (enxuto)
    const { data: clientes, error: errClientes } = await sb
      .from("clientes")
      .select("id, email, nome, telefone, empresa");

    if (errClientes) throw errClientes;

    // 3) Map por email (rápido)
    const mapCli = new Map(
      (clientes ?? []).map((c: any) => [normEmail(c.email), c])
    );

    // 4) (Opcional) tentar enriquecer com Auth: getUserByEmail (um a um, com limite seguro)
    // Isso evita paginar users.list (que é mais pesado). Mantemos “best effort”.
    const MAX_AUTH_LOOKUPS = 25; // segurança: não travar a função se tiver muitos
    let authLookups = 0;

    async function safeGetAuthUserIdByEmail(email: string): Promise<string | null> {
      if (!email) return null;
      if (authLookups >= MAX_AUTH_LOOKUPS) return null;
      authLookups++;

      try {
        const { data } = await sb.auth.admin.getUserByEmail(email);
        return data?.user?.id ?? null;
      } catch {
        return null;
      }
    }

    // 5) montar accounts
    const accounts = await Promise.all(
      (acessos ?? []).map(async (acc: any) => {
        const email = normEmail(acc.email);
        const cli = mapCli.get(email) ?? null;

        // prioridade: id do cliente; fallback: tentar buscar no Auth (limitado)
        const idFromCliente = cli?.id ?? null;
        const idFromAuth = idFromCliente ? null : await safeGetAuthUserIdByEmail(email);

        return {
          id: idFromCliente || idFromAuth || null,
          email,
          nome: cli?.nome ?? null,
          telefone: cli?.telefone ?? null,
          empresa: cli?.empresa ?? null,

          role: acc?.role === "admin" ? "admin" : "cliente",
          ativo: acc?.ativo ?? true,
          is_primary_admin: !!acc?.is_primary_admin,
          is_deleted: !!acc?.is_deleted,
          created_at: acc?.created_at ?? null,
        };
      })
    );

    // ordenar (opcional): admins primeiro? aqui só por email
    accounts.sort((a: any, b: any) => String(a.email).localeCompare(String(b.email)));

    return json(200, { ok: true, accounts });
  } catch (e: any) {
    console.error("admin-list-accounts error:", e);
    return json(500, { error: String(e?.message || e) });
  }
});
