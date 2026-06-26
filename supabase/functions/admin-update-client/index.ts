// supabase/functions/admin-update-client/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGINS = ["https://app.artemoldurados.com.br", "http://localhost:5173"];

// 🔒 Regras do seu sistema
const PRIMARY_SYSTEM_EMAIL = SYSTEM.PRIMARY_SYSTEM_EMAIL;

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, apikey, x-client-info, x-admin-token, content-type, x-actor-email",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

type Body = {
  user_id?: string;   // preferido
  email?: string;     // email atual (fallback)
  email_new?: string; // novo email (se renomear)

  nome?: string;
  empresa?: string;
  segmento?: string;
  telefone?: string;

  // opcional: quem está editando (pra proteger super-admin)
  actor_email?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeEmail(v: any) {
  return String(v || "").trim().toLowerCase();
}

function json(headers: Record<string, string>, status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function isUniqueViolation(e: any) {
  const code = e?.code || e?.cause?.code;
  const msg = String(e?.message || "").toLowerCase();
  return code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint");
}

serve(async (req) => {
  const headers = cors(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });

  try {
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY") ??
      "";

    if (!ADMIN_API_TOKEN || !SUPABASE_URL || !SERVICE_ROLE) {
      return json(headers, 500, {
        error: "Missing secrets (ADMIN_API_TOKEN / SUPABASE_URL / SERVICE_ROLE)",
      });
    }

    const tokenHeader = req.headers.get("x-admin-token") ?? "";
    if (tokenHeader !== ADMIN_API_TOKEN) {
      return json(headers, 401, { error: "Unauthorized (invalid x-admin-token)" });
    }

    // body (robusto)
    const rawBody = await req.text();
    let body: Body;
    try {
      body = JSON.parse(rawBody || "{}") as Body;
    } catch {
      return json(headers, 400, { error: "Invalid JSON body", rawBody });
    }

    const user_id = body.user_id ? String(body.user_id).trim() : "";
    const userIdIsUuid = !!(user_id && UUID_RE.test(user_id));

    const email_old = normalizeEmail(body.email);
    const email_new = normalizeEmail(body.email_new);

    const actor_email =
      normalizeEmail(body.actor_email) ||normalizeEmail(req.headers.get("x-actor-email"));

    if (!userIdIsUuid && !email_old) {
      return json(headers, 400, { error: "Informe user_id (uuid válido) ou email" });
    }

    // update payload
    const update: Record<string, unknown> = {};
    if (typeof body.nome === "string") update.nome = body.nome.trim();
    if (typeof body.empresa === "string") update.empresa = body.empresa.trim() || null;
    if (typeof body.segmento === "string") update.segmento = body.segmento.trim() || null;
    if (typeof body.telefone === "string") update.telefone = body.telefone.trim() || null;

    const wantsEmailChange = !!(email_new && email_new !== email_old);

    if (!wantsEmailChange && Object.keys(update).length === 0) {
      return json(headers, 200, { ok: true, skipped: true });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ------------------------------------------------------------
    // 1) Descobrir registro alvo (adm_clientes)
    // ------------------------------------------------------------
    let target: any = null;

    if (userIdIsUuid) {
      const { data, error } = await sb
        .from("adm_clientes")
        .select("user_id,email,is_deleted")
        .eq("user_id", user_id)
        .maybeSingle();
      if (error) throw error;
      target = data;
    } else {
      const { data, error } = await sb
        .from("adm_clientes")
        .select("user_id,email,is_deleted")
        .eq("email", email_old)
        .maybeSingle();
      if (error) throw error;
      target = data;
    }

    if (!target?.email) {
      return json(headers, 404, {
        error: "Cliente não encontrado",
        email: email_old,
        user_id: userIdIsUuid ? user_id : null,
      });
    }

    const targetEmail = normalizeEmail(target.email);

    if (target?.is_deleted) {
      return json(headers, 409, { error: "Conta já excluída", code: "ACCOUNT_DELETED", email: targetEmail });
    }

    // ------------------------------------------------------------
    // 2) Proteções
    // ------------------------------------------------------------
    if (isPrimaryUser(targetEmail)) {
      // permite editar nome/telefone/empresa, mas NÃO troca email
      if (wantsEmailChange) {
        return json(headers, 403, {
          error: "Não é permitido alterar o e-mail da conta principal do sistema.",
          code: "PRIMARY_SYSTEM_PROTECTED",
          email: targetEmail,
        });
      }
    }

    if (actor_email) {
      const actorIsSuper = SUPER_ADMINS.has(actor_email);
      const targetIsSuper = isSuperAdmin(targetEmail)

      if (targetIsSuper && !actorIsSuper) {
        return json(headers, 403, {
          error: "Somente super-admin pode alterar dados de super-admin.",
          code: "SUPER_ADMIN_PROTECTED",
          email: targetEmail,
        });
      }
    }

    // ------------------------------------------------------------
    // 3) 409: checar duplicidade do email_new antes
    // ------------------------------------------------------------
    if (wantsEmailChange) {
      // adm_clientes: já existe?
      const { data: existsCli, error: exCliErr } = await sb
        .from("adm_clientes")
        .select("email,is_deleted")
        .eq("email", email_new)
        .maybeSingle();
      if (exCliErr) throw exCliErr;

      if (existsCli?.email) {
        if (existsCli?.is_deleted) {
          return json(headers, 409, { error: "Conta já existiu e foi excluída", code: "ACCOUNT_DELETED", email: email_new });
        }
        return json(headers, 409, { error: "E-mail já cadastrado", code: "EMAIL_ALREADY_EXISTS", email: email_new });
      }

      // adm_acessos_permitidos: também pode bloquear por PK/unique
      const { data: existsAcc, error: exAccErr } = await sb
        .from("adm_acessos_permitidos")
        .select("email,is_deleted")
        .eq("email", email_new)
        .maybeSingle();
      if (exAccErr) throw exAccErr;

      if (existsAcc?.email) {
        if (existsAcc?.is_deleted) {
          return json(headers, 409, { error: "Conta já existiu e foi excluída", code: "ACCOUNT_DELETED", email: email_new });
        }
        return json(headers, 409, { error: "E-mail já cadastrado", code: "EMAIL_ALREADY_EXISTS", email: email_new });
      }
    }

    // ------------------------------------------------------------
    // 4) Atualizar adm_clientes (dados + email se mudou)
    // ------------------------------------------------------------
    const updateClientes: Record<string, unknown> = { ...update };
    if (wantsEmailChange) updateClientes.email = email_new;

    let updated: any = null;

    try {
      if (userIdIsUuid) {
        const { data, error } = await sb
          .from("adm_clientes")
          .update(updateClientes)
          .eq("user_id", user_id)
          .select("user_id,email,nome,empresa,telefone,segmento")
          .maybeSingle();
        if (error) throw error;
        updated = data;
      } else {
        const { data, error } = await sb
          .from("adm_clientes")
          .update(updateClientes)
          .eq("email", targetEmail)
          .select("user_id,email,nome,empresa,telefone,segmento")
          .maybeSingle();
        if (error) throw error;
        updated = data;
      }
    } catch (e: any) {
      if (isUniqueViolation(e)) {
        return json(headers, 409, {
          error: "E-mail já cadastrado",
          code: "EMAIL_ALREADY_EXISTS",
          email: email_new || targetEmail,
        });
      }
      throw e;
    }

    // ------------------------------------------------------------
    // 5) Sync: adm_acessos_permitidos (troca email quando mudou)
    // ------------------------------------------------------------
    if (wantsEmailChange) {
      try {
        const { error: aerr } = await sb
          .from("adm_acessos_permitidos")
          .update({ email: email_new })
          .eq("email", targetEmail);

        if (aerr) throw aerr;
      } catch (e: any) {
        if (isUniqueViolation(e)) {
          return json(headers, 409, {
            error: "E-mail já cadastrado",
            code: "EMAIL_ALREADY_EXISTS",
            email: email_new,
          });
        }
        // não deixa inconsistente sem avisar
        throw e;
      }
    }

    // ------------------------------------------------------------
    // 6) Sync: adm_usuarios (nome/telefone)
    // ------------------------------------------------------------
    if (userIdIsUuid) {
      const upUser: Record<string, unknown> = { id: user_id };
      if (typeof body.nome === "string") upUser.nome = body.nome.trim() || null;
      if (typeof body.telefone === "string") upUser.telefone = body.telefone.trim() || null;

      if (Object.keys(upUser).length > 1) {
        const { error: uerr } = await sb.from("adm_usuarios").upsert(upUser, { onConflict: "id" });
        if (uerr) console.warn("adm_usuarios sync warn:", uerr.message);
      }
    }

    return json(headers, 200, { ok: true, updated, email_changed: wantsEmailChange ? { from: targetEmail, to: email_new } : null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("admin-update-client FATAL error:", msg);
    return json(headers, 500, { error: msg });
  }
});
