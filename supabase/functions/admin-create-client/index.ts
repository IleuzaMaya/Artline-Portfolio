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

function normalizeEmail(v: any) {
  return String(v || "").trim().toLowerCase();
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
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ====== BODY ======
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return json(400, { error: "Invalid JSON body" });
    }

    const name = String((payload as any).name || "").trim();
    const email = normalizeEmail((payload as any).email);
    const role = (payload as any).role === "admin" ? "admin" : "cliente";
    const telefone = (payload as any).telefone ? String((payload as any).telefone).trim() : null;
    const empresa = (payload as any).empresa ? String((payload as any).empresa).trim() : null;
    const segmento = (payload as any).segmento ? String((payload as any).segmento).trim() : null;
    const password = (payload as any).password ? String((payload as any).password).trim() : "";

    if (!email) return json(400, { error: "E-mail é obrigatório" });

    // ====== NÃO DUPLICAR ACESSO (E DETECTAR DELETADO) ======
    const { data: accRow, error: accErr } = await sb
      .from("adm_acessos_permitidos")
      .select("email, role, ativo, is_deleted")
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

    // ====== CRIAR/CONVIDAR NO AUTH ======
    try {
      if (password) {
        const created = await sb.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });
        if (created.error) throw created.error;
        userId = created.data.user?.id ?? null;
      } else {
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
        // auth já tem esse email — não sobrescreve
        return json(409, {
          error: "E-mail já cadastrado",
          code: "EMAIL_ALREADY_EXISTS",
          email,
        });
      }
      throw e;
    }

    if (!userId) return json(500, { error: "Falha ao criar usuário (sem userId)" });

    // ====== adm_usuarios (profiles) ======
    // tipo aqui pode continuar usando "admin"/"cliente" (ou seu enum)
    const { error: usrErr } = await sb
      .from("adm_usuarios")
      .upsert(
        { id: userId, nome: name || null, telefone, tipo: role },
        { onConflict: "id" },
      );
    if (usrErr) throw usrErr;

    // ====== adm_clientes (user_id nullable + email UNIQUE) ======
    // (pra UI não quebrar + e-commerce depois)
    const { error: cliErr } = await sb
      .from("adm_clientes")
      .upsert(
        {
          user_id: userId,
          email,
          nome: name || null,
          telefone,
          empresa,
          segmento,
        },
        { onConflict: "email" },
      );
    if (cliErr) throw cliErr;

    // ====== adm_acessos_permitidos ======
    // cria se não existir; se existir, NÃO sobrescreve automaticamente (evita “resetar” role/ativo)
    if (!accRow) {
      const { error: accInsErr } = await sb.from("adm_acessos_permitidos").insert({
        email,
        role,
        ativo: true,
        is_primary_admin: false,
        is_deleted: false,
      });
      if (accInsErr) throw accInsErr;
    }

    return json(200, { ok: true, email, role, invite_link, user_id: userId });
  } catch (e: any) {
    console.error("admin-create-client error:", e);
    return json(500, { error: String(e?.message || e) });
  }
});
