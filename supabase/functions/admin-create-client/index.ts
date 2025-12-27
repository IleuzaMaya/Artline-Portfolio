// supabase/functions/admin-create-client/index.ts
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

    const PROJECT_URL =
      Deno.env.get("PROJECT_URL") ??
      Deno.env.get("SITE_URL") ??
      "https://app.artemoldurados.com.br";

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

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return json(400, { error: "Invalid JSON body" });
    }

    const name = String((payload as any).name || "").trim();
    const emailRaw = String((payload as any).email || "").trim().toLowerCase();
    const role = (String((payload as any).role || "cliente").trim() === "admin")
      ? "admin"
      : "cliente";
    const telefone = String((payload as any).telefone || "").trim() || null;
    const empresa = String((payload as any).empresa || "").trim() || null;
    const password = String((payload as any).password || "").trim();

    if (!emailRaw) return json(400, { error: "E-mail é obrigatório." });

    // 1) checa acessos_permitidos (inclui deletados)
    const { data: accRow, error: accErr } = await sb
      .from("acessos_permitidos")
      .select("email, is_deleted, ativo")
      .eq("email", emailRaw)
      .maybeSingle();

    if (accErr) throw accErr;

    if (accRow?.is_deleted) {
      return json(409, {
        error: "Conta já existiu e foi excluída",
        code: "ACCOUNT_DELETED",
        email: emailRaw,
        can_recover: true,
      });
    }

    // 2) checa duplicidade no AUTH (bloqueia)
    const { data: usersData, error: listErr } = await sb.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      filter: `email.eq.${emailRaw}`,
    });

    if (listErr) throw listErr;

    const existingUser = usersData?.users?.[0] ?? null;
    if (existingUser) {
      return json(409, {
        error: "E-mail já cadastrado",
        code: "EMAIL_ALREADY_EXISTS",
        email: emailRaw,
      });
    }

    // 3) cria usuário OU convida
    let userId: string | null = null;
    let invite_link: string | null = null;

    if (password) {
      const created = await sb.auth.admin.createUser({
        email: emailRaw,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (created.error) throw created.error;
      userId = created.data.user?.id ?? null;
    } else {
      const inv = await sb.auth.admin.inviteUserByEmail(emailRaw, {
        redirectTo: PROJECT_URL,
        data: { name },
      });
      if (inv.error) throw inv.error;
      userId = inv.data.user?.id ?? null;

      const gen = await sb.auth.admin.generateLink({
        type: "invite",
        email: emailRaw,
        options: { redirectTo: PROJECT_URL },
      });
      if (gen.error) throw gen.error;
      invite_link = (gen.data as any)?.properties?.action_link ?? null;
    }

    if (!userId) {
      return json(500, { error: "Falha ao criar/convidar usuário (sem userId)" });
    }

    // 4) grava profiles
    const { error: profErr } = await sb
      .from("profiles")
      .upsert(
        { id: userId, nome: name || null, telefone: telefone, tipo: role },
        { onConflict: "id" }
      );
    if (profErr) throw profErr;

    // 5) grava clientes
    const { error: cliErr } = await sb
      .from("clientes")
      .upsert(
        { id: userId, email: emailRaw, nome: name || null, telefone, empresa },
        { onConflict: "email" }
      );
    if (cliErr) throw cliErr;

    // 6) acessos_permitidos (não sobrescreve)
    if (!accRow) {
      const { error: accInsErr } = await sb
        .from("acessos_permitidos")
        .insert({
          email: emailRaw,
          role,
          ativo: true,
          is_primary_admin: false,
          is_deleted: false,
        });
      if (accInsErr) throw accInsErr;
    }

    return json(200, {
      ok: true,
      email: emailRaw,
      role,
      invite_link,
    });
  } catch (e: any) {
    console.error("admin-create-client error:", e);
    return json(500, { error: String(e?.message || e) });
  }
});
