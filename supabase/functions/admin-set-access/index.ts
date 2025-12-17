//supabase/functions/admin-set-access/index.ts
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

    // ✅ pega caller via JWT (Authorization: Bearer <jwt>)
    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7)
      : "";

    if (!jwt) {
      return json(401, { error: "Missing Authorization bearer token" });
    }

    const { data: callerUser, error: callerErr } = await sb.auth.getUser(jwt);
    if (callerErr || !callerUser?.user) {
      return json(401, { error: "Invalid session" });
    }

    const callerEmail = normEmail(callerUser.user.email);

    // =========================
    // Regras de permissão (BACK)
    // =========================
    const PRIMARY_SYSTEM_EMAIL = "artemoldurados@gmail.com";

    const SUPER_ADMINS = new Set([
      "ileuza.maya@gmail.com",
      "michelle.mayaa@gmail.com",
    ]);

    const isSuperAdmin = SUPER_ADMINS.has(callerEmail);
    const isPrimarySystem = callerEmail === PRIMARY_SYSTEM_EMAIL;

    // Body
    const body = await req.json().catch(() => ({}));
    const targetEmail = normEmail(body?.email);

    const nextRoleRaw = body?.role; // "admin" | "cliente" | undefined
    const nextAtivoRaw = body?.ativo; // boolean | undefined
    const nextDeletedRaw = body?.is_deleted; // boolean | undefined

    if (!targetEmail) {
      return json(400, { error: "email is required" });
    }

    // ninguém mexe em si mesmo (role/ativo/delete)
    if (targetEmail === callerEmail) {
      return json(403, {
        error: "Você não pode alterar seu próprio acesso.",
        code: "CANNOT_EDIT_SELF_ACCESS",
        email: targetEmail,
      });
    }

    // conta principal é protegida: NINGUÉM muda role/ativo/is_deleted dela
    if (targetEmail === PRIMARY_SYSTEM_EMAIL) {
      return json(403, {
        error: "Conta principal do sistema é protegida.",
        code: "PRIMARY_SYSTEM_PROTECTED",
        email: targetEmail,
      });
    }

    // super-admins (ileuza/michelle) só podem ser alterados por super-admin
    if (SUPER_ADMINS.has(targetEmail) && !isSuperAdmin) {
      return json(403, {
        error: "Somente super-admin pode alterar outro super-admin.",
        code: "SUPER_ADMIN_PROTECTED",
        email: targetEmail,
      });
    }

    // regra: admin comum pode mexer em CLIENTES (ativo / is_deleted),
    // mas NÃO pode mexer em admins nem em role.
    // (a conta PRIMARY_SYSTEM_EMAIL pode mexer em todos, menos super-admins e ela mesma)
    const canManageAdmins = isSuperAdmin || isPrimarySystem;

    // carregar o registro alvo
    const { data: currentAcc, error: curErr } = await sb
      .from("acessos_permitidos")
      .select("email, role, ativo, is_deleted, is_primary_admin")
      .eq("email", targetEmail)
      .maybeSingle();

    if (curErr) throw curErr;

    if (!currentAcc) {
      return json(404, {
        error: "Conta não encontrada em acessos_permitidos.",
        code: "ACCOUNT_NOT_FOUND",
        email: targetEmail,
      });
    }

    const targetIsAdmin = String(currentAcc.role || "") === "admin";

    if (targetIsAdmin && !canManageAdmins) {
      return json(403, {
        error: "Você não tem permissão para alterar administradores.",
        code: "CANNOT_EDIT_ADMINS",
        email: targetEmail,
      });
    }

    // admin comum não pode trocar role nunca
    if (typeof nextRoleRaw !== "undefined" && !canManageAdmins) {
      return json(403, {
        error: "Você não tem permissão para alterar o perfil (role).",
        code: "CANNOT_CHANGE_ROLE",
        email: targetEmail,
      });
    }

    // admin comum só pode mexer em ativo/is_deleted de clientes
    if (!canManageAdmins) {
      // se tentou mexer em algo além de ativo/is_deleted (por ex role), já retornou acima
      if (targetIsAdmin) {
        return json(403, {
          error: "Você não tem permissão para alterar administradores.",
          code: "CANNOT_EDIT_ADMINS",
          email: targetEmail,
        });
      }
    }

    // normaliza role
    let nextRole: "admin" | "cliente" | undefined = undefined;
    if (typeof nextRoleRaw !== "undefined") {
      nextRole = nextRoleRaw === "admin" ? "admin" : "cliente";
    }

    // normaliza ativo/is_deleted
    const nextAtivo =
      typeof nextAtivoRaw === "boolean" ? nextAtivoRaw : undefined;
    const nextDeleted =
      typeof nextDeletedRaw === "boolean" ? nextDeletedRaw : undefined;

    // build patch
    const patch: Record<string, any> = {};

    if (typeof nextRole !== "undefined") patch.role = nextRole;
    if (typeof nextAtivo !== "undefined") patch.ativo = nextAtivo;
    if (typeof nextDeleted !== "undefined") patch.is_deleted = nextDeleted;

    if (Object.keys(patch).length === 0) {
      return json(400, {
        error: "Nada para atualizar (role/ativo/is_deleted).",
        code: "NO_CHANGES",
      });
    }

    // Se deletar, força ativo=false (pra “excluir” mesmo)
    if (patch.is_deleted === true) {
      patch.ativo = false;
    }

    // Se recuperar (is_deleted=false) e ativo não veio, reativa
    if (patch.is_deleted === false && typeof patch.ativo === "undefined") {
      patch.ativo = true;
    }

    const { error: updErr } = await sb
      .from("acessos_permitidos")
      .update(patch)
      .eq("email", targetEmail);

    if (updErr) throw updErr;

    return json(200, {
      ok: true,
      email: targetEmail,
      updated: patch,
    });
  } catch (e: any) {
    console.error("admin-set-access error:", e);
    return json(500, { error: String(e?.message || e) });
  }
});
