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

function normalizeEmail(v: any) {
  return String(v || "").trim().toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headersBase });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SERVICE_ROLE =
      Deno.env.get("SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return json(500, { error: "Missing secrets" });
    }

    const adminToken = req.headers.get("x-admin-token") || "";
    if (adminToken !== ADMIN_API_TOKEN) {
      return json(401, { error: "Unauthorized" });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ✅ acessos
    const { data: acessos, error: errAcessos } = await sb
      .from("adm_acessos_permitidos")
      .select("email, role, ativo, is_primary_admin, is_deleted, created_at")
      .eq("is_deleted", false);

    if (errAcessos) throw errAcessos;

    // ✅ clientes (nota: user_id pode ser null)
    const { data: clientes, error: errClientes } = await sb
      .from("adm_clientes")
      .select("user_id, email, nome, telefone, empresa, segmento");

    if (errClientes) throw errClientes;

    const mapCli = new Map((clientes ?? []).map((c: any) => [normalizeEmail(c.email), c]));

    // ✅ Auth users (paginado)
    const mapAuth = new Map<string, any>();
    const PER_PAGE = 200;
    const MAX_PAGES = 25;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: PER_PAGE });
      if (error) throw error;

      const users = data?.users ?? [];
      for (const u of users) {
        const em = normalizeEmail(u.email);
        if (em) mapAuth.set(em, u);
      }
      if (users.length < PER_PAGE) break;
    }

    // ✅ montar lista final
    const accounts = (acessos ?? []).map((acc: any) => {
      const emailAcc = normalizeEmail(acc.email);
      const cli = mapCli.get(emailAcc) ?? null;
      const au = mapAuth.get(emailAcc) ?? null;

      const nameFromAuth =
        au?.user_metadata?.name ||
        au?.user_metadata?.nome ||
        au?.app_metadata?.name ||
        null;

      return {
        // id preferido: user_id do cliente -> auth.id -> null
        user_id: cli?.user_id ?? au?.id ?? null,

        email: emailAcc,
        role: acc.role ?? "cliente",
        ativo: acc.ativo ?? true,
        is_primary_admin: !!acc.is_primary_admin,
        created_at: acc.created_at ?? null,

        // dados “humanos”
        nome: cli?.nome ?? nameFromAuth ?? null,
        telefone: cli?.telefone ?? null,
        empresa: cli?.empresa ?? null,
        segmento: cli?.segmento ?? null,

        // extras úteis
        auth_exists: !!au,
        last_sign_in_at: au?.last_sign_in_at ?? null,
      };
    });

    accounts.sort((a: any, b: any) => {
      const ra = a.role === "admin" ? 0 : 1;
      const rb = b.role === "admin" ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return String(a.nome || a.email).localeCompare(String(b.nome || b.email));
    });

    return json(200, { ok: true, accounts });
  } catch (e: any) {
    console.error("admin-list-accounts error:", e);
    return json(500, { error: String(e?.message || e) });
  }
});
