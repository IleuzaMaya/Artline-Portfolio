// supabase/functions/admin-create-client/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://app.artemoldurados.com.br";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Role = "admin" | "cliente";

interface BodyPayload {
  email: string;
  name?: string;
  telefone?: string;
  empresa?: string;
  password?: string;
  role?: Role;
}

/* ============ CORS helpers ============ */

const DEFAULT_ORIGIN = SITE_URL;

function corsHeaders(origin?: string | null) {
  const o = origin || DEFAULT_ORIGIN;
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-token",
  };
}

/* ============ Handler principal ============ */

serve(async (req) => {
  const origin = req.headers.get("origin") || DEFAULT_ORIGIN;

  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        ...corsHeaders(origin),
      },
    });
  }

  try {
    /* 1) Autorização por token */
    const token = req.headers.get("x-admin-token") ?? "";
    if (!token || token !== ADMIN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Não autorizado (token inválido)." }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        },
      );
    }

    /* 2) Body */
    const body = (await req.json()) as BodyPayload;
    const emailRaw = (body.email ?? "").trim().toLowerCase();
    const name = (body.name ?? "").trim();
    const telefone = (body.telefone ?? "").trim();
    const empresa = (body.empresa ?? "").trim();
    const password = (body.password ?? "").trim();
    const role: Role = body.role === "admin" ? "admin" : "cliente";

    if (!emailRaw) {
      return new Response(
        JSON.stringify({ error: "E-mail é obrigatório." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        },
      );
    }

    /* 3) Verificar se já existe usuário no auth */
    const { data: existingUser, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserByEmail(emailRaw);

    let userId: string | null = null;
    let outcome: "created" | "invited" | "recovery" = "created";

    if (getUserError && getUserError.message?.includes("User not found")) {
      // não existe usuário
      if (password) {
        // cria usuário com senha já definida
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: emailRaw,
          password,
          email_confirm: true,
        });
        if (error || !data?.user) {
          return new Response(
            JSON.stringify({ error: `Erro ao criar usuário: ${error?.message ?? "desconhecido"}` }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders(origin),
              },
            },
          );
        }
        userId = data.user.id;
        outcome = "created";
      } else {
        // convida usuário por e-mail
        const { data, error } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(emailRaw, {
            redirectTo: `${SITE_URL}/reset`,
          });
        if (error || !data?.user) {
          return new Response(
            JSON.stringify({ error: `Erro ao convidar usuário: ${error?.message ?? "desconhecido"}` }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders(origin),
              },
            },
          );
        }
        userId = data.user.id;
        outcome = "invited";
      }
    } else if (existingUser?.user) {
      // já existe usuário → gera link de recuperação
      userId = existingUser.user.id;
      const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: emailRaw,
        options: { redirectTo: `${SITE_URL}/reset` },
      });
      if (linkError) {
        return new Response(
          JSON.stringify({
            error: `Usuário já existe, mas falhou gerar link de recuperação: ${linkError.message}`,
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(origin),
            },
          },
        );
      }
      outcome = "recovery";
    } else if (getUserError) {
      // outro erro qualquer
      return new Response(
        JSON.stringify({ error: `Erro ao buscar usuário: ${getUserError.message}` }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        },
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Não foi possível determinar o ID do usuário." }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        },
      );
    }

    /* 4) Acessos_permitidos (reativar se estava deletado) */
    const { data: acessoAntes } = await supabaseAdmin
      .from("acessos_permitidos")
      .select("is_deleted, ativo")
      .eq("email", emailRaw)
      .maybeSingle();

    const wasDeleted =
      acessoAntes?.is_deleted === true || acessoAntes?.ativo === false;

    const { error: upsertAcessoError } = await supabaseAdmin
      .from("acessos_permitidos")
      .upsert(
        {
          email: emailRaw,
          role,
          ativo: true,
          is_deleted: false,
          deleted_at: null,
        },
        { onConflict: "email" },
      );

    if (upsertAcessoError) {
      return new Response(
        JSON.stringify({
          error: `Erro ao salvar acessos_permitidos: ${upsertAcessoError.message}`,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        },
      );
    }

    /* 5) Profiles */
    const { error: upsertProfileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          nome: name || null,
          telefone: telefone || null,
          tipo: role,
        },
        { onConflict: "id" },
      );

    if (upsertProfileError) {
      return new Response(
        JSON.stringify({
          error: `Erro ao salvar profile: ${upsertProfileError.message}`,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        },
      );
    }

    /* 6) Clientes (todo mundo entra aqui, admin também) */
    const { error: upsertClienteError } = await supabaseAdmin
      .from("clientes")
      .upsert(
        {
          id: userId,
          email: emailRaw,
          nome: name || null,
          telefone: telefone || null,
          empresa: empresa || null,
        },
        { onConflict: "id" },
      );

    if (upsertClienteError) {
      return new Response(
        JSON.stringify({
          error: `Erro ao salvar cliente: ${upsertClienteError.message}`,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        },
      );
    }

    /* 7) Resposta final */
    const respBody: Record<string, unknown> = {
      outcome,
      email: emailRaw,
      role,
      userId,
    };
    if (wasDeleted) respBody.reactivated = true;

    return new Response(JSON.stringify(respBody), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(origin),
      },
    });
  } catch (err) {
    console.error("admin-create-client error", err);
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(req.headers.get("origin")),
        },
      },
    );
  }
});
