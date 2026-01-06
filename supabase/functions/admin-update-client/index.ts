// supabase/functions/admin-update-client/index.ts
// supabase/functions/admin-update-client/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGINS = ["https://app.artemoldurados.com.br", "http://localhost:5173"];

// 🔒 Regras do seu sistema
const PRIMARY_SYSTEM_EMAIL = "artemoldurados@gmail.com";
const SUPER_ADMINS = new Set([
  "artemoldurados@gmail.com",
  "ileuza.maya@gmail.com",
  "michelle.mayaa@gmail.com",
]);

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
  // identificador preferido
  user_id?: string;

  // referência antiga (fallback)
  email?: string;

  // novo email (quando renomear)
  email_new?: string;

  // dados editáveis
  nome?: string;
  empresa?: string;
  segmento?: string;
  telefone?: string;

  // opcional (para proteção super-admin)
  actor_email?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normEmail(v: any) {
  return String(v || "").trim().toLowerCase();
}

function json(headers: Record<string, string>, status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
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

    // body
    const rawBody = await req.text();
    let body: Body;
    try {
      body = JSON.parse(rawBody || "{}") as Body;
    } catch {
      return json(headers, 400, { error: "Invalid JSON body", rawBody });
    }

    const user_id = body.user_id ? String(body.user_id).trim() : "";
    const userIdIsUuid = !!(user_id && UUID_RE.test(user_id));

    const email_old = normEmail(body.email);       // referência (email atual)
    const email_new = normEmail(body.email_new);   // novo email (se mudar)
    const actor_email = normEmail(body.actor_email || req.headers.get("x-actor-email"));

    // precisa de user_id OU email_old
    if (!userIdIsUuid && !email_old) {
      return json(headers, 400, { error: "Informe user_id (uuid válido) ou email" });
    }

    // update payload (campos humanos)
    const update: Record<string, unknown> = {};
    if (typeof body.nome === "string") update.nome = body.nome.trim();
    if (typeof body.empresa === "string") update.empresa = body.empresa.trim();
    if (typeof body.segmento === "string") update.segmento = body.segmento.trim();
    if (typeof body.telefone === "string") update.telefone = body.telefone.trim();

    const wantsEmailChange = !!(email_new && email_new !== email_old);

    if (!wantsEmailChange && Object.keys(update).length === 0) {
      return json(headers, 200, { ok: true, skipped: true });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ------------------------------------------------------------
    // 1) Descobrir registro alvo (email atual + flags)
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
        email: email_old || null,
        user_id: userIdIsUuid ? user_id : null,
      });
    }

    const targetEmail = normEmail(target.email);

    // 409: conta já está deletada (se você usa is_deleted)
    if (target?.is_deleted) {
      return json(headers, 409, { error: "Conta desativada/excluída", code: "ACCOUNT_DELETED", email: targetEmail });
    }

    // ------------------------------------------------------------
    // 2) Proteções de contas críticas
    // ------------------------------------------------------------
    // não permitir mexer no email da conta principal
    if (wantsEmailChange && targetEmail === PRIMARY_SYSTEM_EMAIL) {
      return json(headers, 403, { error: "Não é permitido alterar o e-mail da conta principal." });
    }

    // proteger super-admin (se informar actor_email)
    if (actor_email) {
      const actorIsSuper = SUPER_ADMINS.has(actor_email);
      const targetIsSuper = SUPER_ADMINS.has(targetEmail);

      if (targetIsSuper && !actorIsSuper) {
        return json(headers, 403, {
          error: "Somente super-admin pode alterar dados de super-admin.",
          code: "SUPER_ADMIN_PROTECTED",
          email: targetEmail,
        });
      }
    }

    // ------------------------------------------------------------
    // 3) Troca de e-mail: validar duplicidade antes (adm_clientes)
    // ------------------------------------------------------------
    if (wantsEmailChange) {
      const { data: exists, error: exErr } = await sb
        .from("adm_clientes")
        .select("email,is_deleted")
        .eq("email", email_new)
        .maybeSingle();
      if (exErr) throw exErr;

      if (exists?.email) {
        if (exists?.is_deleted) {
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

    // ------------------------------------------------------------
    // 5) Sync: adm_acessos_permitidos (troca email quando mudou)
    // Estratégia segura: duplica linha e desativa a antiga (evita update de PK)
    // ------------------------------------------------------------
    if (wantsEmailChange) {
      // 5.1) Se já existe acesso com o email novo -> 409
      const { data: accNew, error: accNewErr } = await sb
        .from("adm_acessos_permitidos")
        .select("email, is_deleted")
        .eq("email", email_new)
        .maybeSingle();
      if (accNewErr) throw accNewErr;

      if (accNew?.email) {
        if (accNew?.is_deleted) {
          return json(headers, 409, { error: "Conta já existiu e foi excluída", code: "ACCOUNT_DELETED", email: email_new });
        }
        return json(headers, 409, { error: "E-mail já cadastrado", code: "EMAIL_ALREADY_EXISTS", email: email_new });
      }

      // 5.2) Carrega a linha atual (email antigo)
      const { data: accOld, error: accOldErr } = await sb
        .from("adm_acessos_permitidos")
        .select("email, user_id, role, ativo, is_deleted, is_primary_admin")
        .eq("email", targetEmail)
        .maybeSingle();
      if (accOldErr) throw accOldErr;

      if (!accOld?.email) {
        console.warn("adm_acessos_permitidos: registro antigo não encontrado p/ sync", targetEmail);
      } else {
        // proteção adicional: se for super-admin/primary, não deixa mexer
        // (mesmo que adm_clientes não tenha isso, aqui é proteção extra de integridade)
        if (targetEmail === PRIMARY_SYSTEM_EMAIL) {
          return json(headers, 403, { error: "Conta principal do sistema é protegida.", code: "PRIMARY_SYSTEM_PROTECTED", email: targetEmail });
        }
        if (SUPER_ADMINS.has(targetEmail) && actor_email && !SUPER_ADMINS.has(actor_email)) {
          return json(headers, 403, { error: "Somente super-admin pode alterar super-admin.", code: "SUPER_ADMIN_PROTECTED", email: targetEmail });
        }

        // 5.3) Cria novo registro com email_new (copia campos)
        const { error: insErr } = await sb.from("adm_acessos_permitidos").insert({
          email: email_new,
          user_id: accOld.user_id ?? null,
          role: accOld.role ?? "cliente",
          ativo: accOld.ativo ?? true,
          is_deleted: accOld.is_deleted ?? false,
          is_primary_admin: accOld.is_primary_admin ?? false,
        });
        if (insErr) throw insErr;

        // 5.4) Desativa o antigo (mantém histórico)
        const { error: oldUpdErr } = await sb
          .from("adm_acessos_permitidos")
          .update({ ativo: false, is_deleted: true })
          .eq("email", targetEmail);

        if (oldUpdErr) console.warn("adm_acessos_permitidos old disable warn:", oldUpdErr.message);
      }
    }

    // ------------------------------------------------------------
    // 6) Sync opcional: adm_usuarios (nome/telefone)
    // ------------------------------------------------------------
    if (userIdIsUuid) {
      const upUser: Record<string, unknown> = { id: user_id };
      if (typeof body.nome === "string") upUser.nome = body.nome.trim();
      if (typeof body.telefone === "string") upUser.telefone = body.telefone.trim();

      if (Object.keys(upUser).length > 1) {
        const { error: uerr } = await sb.from("adm_usuarios").upsert(upUser, { onConflict: "id" });
        if (uerr) console.warn("adm_usuarios sync warn:", uerr.message);
      }
    }

    return json(headers, 200, { ok: true, updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("admin-update-client FATAL error:", msg);
    return json(headers, 500, { error: msg });
  }
});
