// supabase/functions/admin-create-client/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Role = "admin" | "cliente";

const headersBase = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function cors(origin: string | null) {
  return {
    ...headersBase,
    "Access-Control-Allow-Origin": origin ?? "*",
  };
}

function json(origin: string | null, status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

function normEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normText(v: unknown) {
  return String(v ?? "").trim();
}

function safeRole(v: unknown): Role {
  const r = String(v ?? "").trim().toLowerCase();
  return r === "admin" ? "admin" : "cliente";
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  try {
    // Preflight
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });

    if (req.method !== "POST") {
      return json(origin, 405, {
        ok: false,
        code: "METHOD_NOT_ALLOWED",
        error: "Method not allowed",
      });
    }

    // ====== Secrets ======
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";

    const SERVICE_ROLE =
      Deno.env.get("SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

    // URL para redirect dos links (invite/reset)
    const PROJECT_URL =
      Deno.env.get("PROJECT_URL") ??
      Deno.env.get("SITE_URL") ??
      Deno.env.get("VITE_SITE_URL") ?? // se alguém acabou colocando por engano
      "";

    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return json(origin, 500, {
        ok: false,
        code: "MISSING_SECRETS",
        error: "Missing secrets",
        missing: {
          ADMIN_API_TOKEN: !ADMIN_API_TOKEN,
          SERVICE_ROLE: !SERVICE_ROLE,
          SUPABASE_URL: !SUPABASE_URL,
        },
      });
    }

    const token = req.headers.get("x-admin-token") ?? "";
    if (token !== ADMIN_API_TOKEN) {
      return json(origin, 401, {
        ok: false,
        code: "UNAUTHORIZED",
        error: "Unauthorized",
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ====== Body ======
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // se vier vazio, mantém {}
      body = {};
    }

    const email = normEmail(body.email);
    const name = normText(body.name || body.nome);
    const empresa = normText(body.empresa);
    const telefone = normText(body.telefone);
    const role: Role = safeRole(body.role);
    const password = normText(body.password);

    if (!email) {
      return json(origin, 400, {
        ok: false,
        code: "VALIDATION",
        error: "E-mail é obrigatório.",
      });
    }

    // ====== 1) Bloqueio de duplicidade (Auth) ======
    // (é aqui que garante: NÃO sobrescrever nunca)
    const { data: existing, error: getErr } = await sb.auth.admin.getUserByEmail(email);
    if (getErr) {
      // Se isso falhar, melhor devolver erro explícito
      return json(origin, 500, {
        ok: false,
        code: "AUTH_GET_BY_EMAIL_FAILED",
        error: getErr.message,
      });
    }
    if (existing?.user) {
      return json(origin, 409, {
        ok: false,
        code: "EMAIL_ALREADY_EXISTS",
        error: "E-mail já cadastrado",
        email,
      });
    }

    // ====== 2) Bloqueio de duplicidade (acessos_permitidos) — extra segurança ======
    const { data: accFound, error: accErr } = await sb
      .from("acessos_permitidos")
      .select("email, is_deleted")
      .eq("email", email)
      .maybeSingle();

    if (accErr) {
      return json(origin, 500, {
        ok: false,
        code: "DB_ACCESS_LOOKUP_FAILED",
        error: accErr.message,
      });
    }

    if (accFound && accFound.is_deleted === false) {
      return json(origin, 409, {
        ok: false,
        code: "EMAIL_ALREADY_EXISTS",
        error: "E-mail já cadastrado",
        email,
      });
    }

    // ====== 3) Criar usuário OU gerar link de convite ======
    let userId: string | null = null;
    let invite_link: string | null = null;

    if (password) {
      // cria com senha (não envia convite)
      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // opcional (mantenho true pra evitar travar login)
        user_metadata: {
          nome: name || null,
          empresa: empresa || null,
          telefone: telefone || null,
          role,
        },
      });

      if (createErr) {
        // se por algum motivo virou duplicado ao mesmo tempo (race), converte pra 409
        const msg = createErr.message || "Erro ao criar usuário";
        const isDup =
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("exists") ||
          msg.toLowerCase().includes("duplicate");
        return json(origin, isDup ? 409 : 500, {
          ok: false,
          code: isDup ? "EMAIL_ALREADY_EXISTS" : "AUTH_CREATE_FAILED",
          error: isDup ? "E-mail já cadastrado" : msg,
          email,
        });
      }

      userId = created?.user?.id ?? null;
    } else {
      // Sem senha: gera link de invite (para você mandar manualmente)
      // Se PROJECT_URL estiver vazio, ainda gera, mas sem redirect.
      const { data: gen, error: genErr } = await sb.auth.admin.generateLink({
        type: "invite",
        email,
        options: PROJECT_URL ? { redirectTo: PROJECT_URL } : undefined,
      });

      if (genErr) {
        return json(origin, 500, {
          ok: false,
          code: "AUTH_GENERATE_INVITE_FAILED",
          error: genErr.message,
          hint: PROJECT_URL ? undefined : "PROJECT_URL/SITE_URL não configurado (redirectTo vazio).",
        });
      }

      invite_link = gen?.properties?.action_link ?? null;
      userId = gen?.user?.id ?? null;

      // Garante que veio algo útil
      if (!invite_link) {
        return json(origin, 500, {
          ok: false,
          code: "INVITE_LINK_EMPTY",
          error: "Não foi possível gerar o link de convite.",
        });
      }
    }

    if (!userId) {
      return json(origin, 500, {
        ok: false,
        code: "USER_ID_MISSING",
        error: "Não foi possível obter o ID do usuário criado.",
      });
    }

    // ====== 4) Persistir no DB (profiles / clientes / acessos_permitidos) ======
    // profiles
    const { error: profErr } = await sb.from("profiles").upsert(
      {
        id: userId,
        nome: name || null,
        telefone: telefone || null,
        tipo: role, // "admin" | "cliente"
      },
      { onConflict: "id" }
    );

    if (profErr) {
      return json(origin, 500, {
        ok: false,
        code: "DB_PROFILE_UPSERT_FAILED",
        error: profErr.message,
      });
    }

    // clientes (seu schema: id uuid PK -> auth.users, email unique)
    const { error: cliErr } = await sb.from("clientes").upsert(
      {
        id: userId,
        email,
        nome: name || null,
        telefone: telefone || null,
        empresa: empresa || null,
      },
      { onConflict: "id" }
    );

    if (cliErr) {
      return json(origin, 500, {
        ok: false,
        code: "DB_CLIENT_UPSERT_FAILED",
        error: cliErr.message,
      });
    }

    // acessos_permitidos (email PK)
    // Se existia como deletado, "ressuscita" com ativo true.
    const { error: accUpErr } = await sb.from("acessos_permitidos").upsert(
      {
        email,
        role,
        ativo: true,
        is_primary_admin: false,
        is_deleted: false,
      },
      { onConflict: "email" }
    );

    if (accUpErr) {
      return json(origin, 500, {
        ok: false,
        code: "DB_ACCESS_UPSERT_FAILED",
        error: accUpErr.message,
      });
    }

    // ====== OK ======
    return json(origin, 200, {
      ok: true,
      email,
      role,
      invite_link, // null se criou com senha
      user_id: userId,
    });
  } catch (e: any) {
    console.error("admin-create-client FATAL:", e);
    return json(origin, 500, {
      ok: false,
      code: "INTERNAL",
      error: String(e?.message ?? e),
    });
  }
});
