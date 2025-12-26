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
    // ✅ secrets (compatível com os dois nomes)
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

    // ✅ Tabelas (select enxuto)
    const { data: acessos, error: errAcessos } = await sb
      .from("acessos_permitidos")
      .select("email, role, ativo, is_primary_admin, is_deleted, created_at")
      .eq("is_deleted", false);

    if (errAcessos) throw errAcessos;

    const { data: clientes, error: errClientes } = await sb
      .from("clientes")
      .select("id, email, nome, telefone, empresa");

    if (errClientes) throw errClientes;

    // ✅ Map por email (clientes)
    const mapCli = new Map(
      (clientes ?? []).map((c: any) => [normEmail(c.email), c])
    );

    // ✅ Puxar usuários do Auth com paginação e mapear por email
    const mapAuth = new Map<string, any>();

    const PER_PAGE = 200;     // seguro
    const MAX_PAGES = 25;     // evita loop infinito (até 5000 usuários)

    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, error } = await sb.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });

      if (error) throw error;

      const users = data?.users ?? [];
      for (const u of users) {
        const em = normEmail(u.email);
        if (em) mapAuth.set(em, u);
      }

      // se veio menos que PER_PAGE, acabou
      if (users.length < PER_PAGE) break;
    }

    // ✅ Montar lista final
    const accounts = (acessos ?? []).map((acc: any) => {
      const emailAcc = normEmail(acc.email);
      const cli = mapCli.get(emailAcc) ?? null;
      const au = mapAuth.get(emailAcc) ?? null;

      // Nome preferencial: cliente.nome -> auth.user_metadata.name -> null
      const nameFromAuth =
        au?.user_metadata?.name ||
        au?.user_metadata?.nome ||
        au?.app_metadata?.name ||
        null;

      return {
        // id: preferir clientes.id (uuid do auth.users)
        id: cli?.id ?? au?.id ?? null,

        email: emailAcc,
        role: acc.role ?? "cliente",
        ativo: acc.ativo ?? true,
        is_primary_admin: !!acc.is_primary_admin,
        created_at: acc.created_at ?? null,

        // dados “humanos”
        nome: cli?.nome ?? nameFromAuth ?? null,
        telefone: cli?.telefone ?? null,
        empresa: cli?.empresa ?? null,

        // extras úteis (opcional)
        auth_exists: !!au,
        last_sign_in_at: au?.last_sign_in_at ?? null,
      };
    });

    // opcional: ordenar (admins primeiro, depois nome)
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
