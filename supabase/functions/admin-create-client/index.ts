import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Origens permitidas (prod e dev)
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
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });

  try {
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SERVICE_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") ?? "";
    const RESET_REDIRECT_TO = Deno.env.get("RESET_REDIRECT_TO") ?? "https://app.artemoldurados.com.br/reset";

    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return new Response(JSON.stringify({ error: "Missing function secrets" }), {
        status: 500, headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const token = req.headers.get("x-admin-token") ?? "";
    if (token !== ADMIN_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const { email, name, password, role = "cliente", redirectTo } = await req.json();
    if (!email || !name) {
      return new Response(JSON.stringify({ error: "Email e name são obrigatórios" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // normaliza e-mail
    const normEmail = String(email).trim().toLowerCase();

    // helper: tenta achar userId por e-mail (varre até 5 páginas)
    async function findUserIdByEmail(sb: any, e: string) {
      for (let page = 1; page <= 5; page++) {
        const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        const u = data?.users?.find((u: any) => (u.email || "").toLowerCase() === e);
        if (u) return u.id as string;
        if (!data || data.users.length < 200) break; // acabou a paginação
      }
      return null;
    }

    // Cria usuário com senha OU envia convite, tolerando "já registrado"
    let userId: string | null = null;
    try {
      if (password && String(password).length > 0) {
        const { data, error } = await sbAdmin.auth.admin.createUser({
          email: normEmail,
          password,
          user_metadata: { name, tipo: role },
        });
        if (error) throw error;
        userId = data.user?.id ?? null;
      } else {
      // 1) dispara o e-mail padrão do Supabase
      const { data: inv, error: invErr } = await sbAdmin.auth.admin.inviteUserByEmail(email, {
        data: { name, tipo: role }, redirectTo: redirectTo || RESET_REDIRECT_TO,
      });
      if (invErr) throw invErr;
      userId = inv.user?.id ?? null;

      // 2) gera o mesmo link para você copiar/colar
      var action_link: string | null = null;
      const { data: linkData, error: linkErr } = await sbAdmin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { data: { name, tipo: role }, redirectTo: redirectTo || RESET_REDIRECT_TO }
      });
      if (!linkErr) action_link = linkData?.action_link ?? null;
    }

    } catch (e) {
      const msg = String((e as any)?.message ?? e ?? "").toLowerCase();
      if (msg.includes("already been registered")) {
        // usuário já existe -> seguimos com upserts
        userId = await findUserIdByEmail(sbAdmin, normEmail);
      } else if (msg.includes("email address") && msg.includes("invalid")) {
        // e-mail inválido -> 400 amigável
        return new Response(JSON.stringify({ error: "E-mail inválido." }), {
          status: 400, headers: { ...headers, "Content-Type": "application/json" }
        });
      } else {
        throw e;
      }
    }
  
    // acessos_permitidos
    {
      const { error } = await sbAdmin
        .from("acessos_permitidos")
        .upsert({ email: normEmail, role, ativo: true }, { onConflict: "email" });
      if (error) throw error;
    }

    // profiles (se já existir, atualiza nome/tipo)
    if (userId) {
      const { error } = await sbAdmin
        .from("profiles")
        .upsert({ id: userId, nome: name, tipo: role }, { onConflict: "id" });
      if (error) throw error;
    }

    // clientes
    {
      const payload = userId
        ? { id: userId, email: normEmail, nome: name }
        : { email: normEmail, nome: name };
      const { error } = await sbAdmin
        .from("clientes")
        .upsert(payload, { onConflict: userId ? "id" : "email" });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true, userId, action_link }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-create-client error:", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" }
    });
  }
});
