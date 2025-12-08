// supabase/functions/admin-create-client/index.ts
// Deno Deploy — Edge Function
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://app.artemoldurados.com.br",
  "http://localhost:5173",
];

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, x-admin-token, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST")  return new Response("Method not allowed", { status: 405, headers });

  try {
    // ==== Secrets/env ====
    const ADMIN_API_TOKEN   = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SERVICE_ROLE      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
    const RESET_REDIRECT_TO = Deno.env.get("RESET_REDIRECT_TO") ?? "https://app.artemoldurados.com.br/reset";

    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return new Response(JSON.stringify({ error: "Missing function secrets" }), {
        status: 500, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // ==== Auth do caller (admin) ====
    const token = req.headers.get("x-admin-token") ?? "";
    if (token !== ADMIN_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // ==== Payload ====
    const body = await req.json().catch(() => ({}));
    const {
      email,
      name,
      password,
      role = "cliente",
      telefone = "",
      empresa = "",
      redirectTo,
    } = body || {};

    if (!email || !name) {
      return new Response(JSON.stringify({ error: "Email e name são obrigatórios" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const normEmail = String(email).trim().toLowerCase();
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // ==== Helper: localizar userId de auth por e-mail (pagina em até 5) ====
    async function findUserIdByEmail(sb: any, e: string): Promise<string | null> {
      for (let page = 1; page <= 5; page++) {
        const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        const u = data?.users?.find((u: any) => (u.email || "").toLowerCase() === e);
        if (u) return u.id as string;
        if (!data || data.users.length < 200) break;
      }
      return null;
    }

    // ==== Criar/Convidar/Recuperar ====
    let userId: string | null = null;
    let action_link: string | null = null; // convite ou recovery
    let outcome: "created" | "invited" | "recovery" | null = null;

    try {
      if (password && String(password).length > 0) {
        // Cria usuário com senha
        const { data, error } = await supa.auth.admin.createUser({
          email: normEmail,
          password: String(password),
          user_metadata: { name, tipo: role },
          email_confirm: true,
        });
        if (error) throw error;
        userId = data.user?.id ?? null;
        outcome = "created";
      } else {
        // Gera link de convite (retorna o link para você enviar)
        const { data, error } = await supa.auth.admin.generateLink({
          type: "invite",
          email: normEmail,
          options: {
            data: { name, tipo: role },
            redirectTo: redirectTo || RESET_REDIRECT_TO,
          },
        });
        if (error) throw error;
        action_link =
          (data as any)?.properties?.action_link ??
          (data as any)?.action_link ?? null;
        userId = data.user?.id ?? null;
        outcome = "invited";
      }
    } catch (e) {
      const msg = String(e?.message ?? e ?? "").toLowerCase();
      if (msg.includes("already been registered") || msg.includes("already registered")) {
        // Já existe → gera link de recuperação
        userId = await findUserIdByEmail(supa, normEmail);
        const { data, error } = await supa.auth.admin.generateLink({
          type: "recovery",
          email: normEmail,
          options: { redirectTo: redirectTo || RESET_REDIRECT_TO },
        });
        if (!error) {
          action_link =
            (data as any)?.properties?.action_link ??
            (data as any)?.action_link ?? null;
          outcome = "recovery";
        } else {
          throw error;
        }
      } else if (msg.includes("email address") && msg.includes("invalid")) {
        return new Response(JSON.stringify({ error: "E-mail inválido." }), {
          status: 400, headers: { ...headers, "Content-Type": "application/json" },
        });
      } else {
        throw e;
      }
    }

    // ==== Upserts & reativação leve (soft-undelete) ====
    let reactivated = false;

    // acessos_permitidos
    {
      // vê se já existe e se está “apagado”
      const { data: ap } = await supa
        .from("acessos_permitidos")
        .select("email, ativo, is_deleted")
        .eq("email", normEmail)
        .maybeSingle();

      if (ap && (ap.is_deleted === true || ap.ativo === false)) {
        reactivated = true;
        const { error } = await supa
          .from("acessos_permitidos")
          .update({ ativo: true, is_deleted: false, deleted_at: null, role })
          .eq("email", normEmail);
        if (error) throw error;
      } else {
        const { error } = await supa
          .from("acessos_permitidos")
          .upsert({ email: normEmail, role, ativo: true }, { onConflict: "email" });
        if (error) throw error;
      }
    }

    // profiles
    if (userId) {
      const { error } = await supa
        .from("profiles")
        .upsert({ id: userId, nome: name, tipo: role }, { onConflict: "id" });
      if (error) throw error;
    }

    // clientes
    {
      // se cliente existir “apagado”, reativamos
      const { data: cli } = await supa
        .from("clientes")
        .select("id, email, ativo, is_deleted")
        .or(`id.eq.${userId ?? "null"},email.eq.${normEmail}`)
        .limit(1);

      if (cli && cli.length > 0 && (cli[0].is_deleted === true || cli[0].ativo === false)) {
        reactivated = true;
        const key = cli[0].id ? { id: cli[0].id } : { email: normEmail };
        const { error } = await supa
          .from("clientes")
          .update({ nome: name, ativo: true, is_deleted: false, deleted_at: null })
          .match(key);
        if (error) throw error;
      } else {
        const payload = userId
          ? { id: userId, email: normEmail, nome: name, ativo: true }
          : { email: normEmail, nome: name, ativo: true };
        const { error } = await supa
          .from("clientes")
          .upsert(payload, { onConflict: userId ? "id" : "email" });
        if (error) throw error;
      }
    }

    // ==== OK ====
    const message =
      outcome === "created"  ? "Usuário criado com senha definida."
    : outcome === "invited"  ? "Convite gerado (action_link retornado)."
    : outcome === "recovery" ? "Usuário já existia: link de recuperação gerado."
    : "Operação concluída.";

    return new Response(JSON.stringify({
      ok: true,
      outcome,          // "created" | "invited" | "recovery"
      userId,
      action_link,      // convite ou recovery
      reactivated,      // true se algum soft-delete foi revertido
      message,
    }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("admin-create-client error:", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
