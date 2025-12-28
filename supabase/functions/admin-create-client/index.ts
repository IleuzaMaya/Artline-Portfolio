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

function isEmailAlreadyExistsError(e: any) {
  const msg = String(e?.message || e || "").toLowerCase();
  return (
    msg.includes("already") ||
    msg.includes("exists") ||
    msg.includes("registered") ||
    msg.includes("duplicate")
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headersBase });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    // ====== SECRETS ======
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY") ??
      "";

    const PROJECT_URL =
      Deno.env.get("PROJECT_URL") ??
      Deno.env.get("SITE_URL") ??
      "https://app.artemoldurados.com.br";

    if (!ADMIN_API_TOKEN || !SUPABASE_URL || !SERVICE_ROLE) {
      return json(500, { error: "Missing secrets" });
    }

    // ====== AUTH ADMIN ======
    const adminToken = req.headers.get("x-admin-token") || "";
    if (adminToken !== ADMIN_API_TOKEN) {
      return json(401, { error: "Unauthorized" });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // ====== BODY ======
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return json(400, { error: "Invalid JSON body" });
    }

    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const role = payload.role === "admin" ? "admin" : "cliente";
    const telefone = payload.telefone ? String(payload.telefone).trim() : null;
    const empresa = payload.empresa ? String(payload.empresa).trim() : null;
    const password = payload.password ? String(payload.password).trim() : "";

    if (!email) {
      return json(400, { error: "E-mail é obrigatório" });
    }

    // ====== NÃO DUPLICAR acesso ======
    const { data: accRow, error: accErr } = await sb
      .from("acessos_permitidos")
      .select("email, is_deleted")
      .eq("email", email)
      .maybeSingle();

    if (accErr) throw accErr;

    if (accRow?.is_deleted) {
      return json(409, {
        error: "Conta já existiu e foi excluída",
        code: "ACCOUNT_DELETED",
        email,
        can_recover: true,
      });
    }

    let userId: string | null = null;
    let invite_link: string | null = null;

    try {
      if (password) {
        // ====== CRIA COM SENHA ======
        const created = await sb.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });
        if (created.error) throw created.error;
        userId = created.data.user?.id ?? null;
      } else {
        // ====== CONVIDA ======
        const inv = await sb.auth.admin.inviteUserByEmail(email, {
          redirectTo: PROJECT_URL,
          data: { name },
        });
        if (inv.error) throw inv.error;
        userId = inv.data.user?.id ?? null;

        const gen = await sb.auth.admin.generateLink({
          type: "invite",
          email,
          options: { redirectTo: PROJECT_URL },
        });
        if (!gen.error) {
          invite_link = (gen.data as any)?.properties?.action_link ?? null;
        }
      }
    } catch (e: any) {
      if (isEmailAlreadyExistsError(e)) {
        return json(409, {
          error: "E-mail já cadastrado",
          code: "EMAIL_ALREADY_EXISTS",
          email,
        });
      }
      throw e;
    }

    if (!userId) {
      return json(500, { error: "Falha ao criar usuário (sem userId)" });
    }

    // ====== PROFILES ======
    const { error: profErr } = await sb
      .from("profiles")
      .upsert(
        { id: userId, nome: name || null, telefone, tipo: role },
        { onConflict: "id" }
      );
    if (profErr) throw profErr;

    // ====== CLIENTES ======
    const { error: cliErr } = await sb
      .from("clientes")
      .upsert(
        { id: userId, email, nome: name || null, telefone, empresa },
        { onConflict: "email" }
      );
    if (cliErr) throw cliErr;

    // ====== ACESSOS ======
    if (!accRow) {
      const { error: accInsErr } = await sb
        .from("acessos_permitidos")
        .insert({
          email,
          role,
          ativo: true,
          is_primary_admin: false,
          is_deleted: false,
        });
      if (accInsErr) throw accInsErr;
    }

    return json(200, {
      ok: true,
      email,
      role,
      invite_link,
    });
  } catch (e: any) {
    console.error("admin-create-client error:", e);
    return json(500, { error: String(e?.message || e) });
  }
});
