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
  role?: Role; // "admin" | "cliente"
}

serve(async (req) => {
  try {
    // 1) Autorização por token
    const token = req.headers.get("x-admin-token") ?? "";
    if (!token || token !== ADMIN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Não autorizado (token inválido)." }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // 2) Body
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
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 3) Verifica se usuário já existe no Auth
    const { data: userByEmail, error: getUserErr } =
      await supabaseAdmin.auth.admin.getUserByEmail(emailRaw);

    let userId: string | null = null;
    let outcome: "created" | "invited" | "recovery" | null = null;

    if (getUserErr) {
      // getUserByEmail retorna erro quando não encontra -> tratamos como "não existe"
      if (!String(getUserErr.message || "").toLowerCase().includes("user not found")) {
        console.error("Erro getUserByEmail:", getUserErr);
      }
    }

    if (!userByEmail?.user) {
      // 3a) Usuário não existe -> cria
      if (password && password.length >= 8) {
        // cria com senha definida
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: emailRaw,
          password,
          email_confirm: true,
          user_metadata: { name },
        });
        if (error || !data.user) {
          console.error("Erro createUser:", error);
          return new Response(
            JSON.stringify({ error: error?.message ?? "Falha ao criar usuário." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        userId = data.user.id;
        outcome = "created";
      } else {
        // cria via convite (link de convite)
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          emailRaw,
          { redirectTo: `${SITE_URL}/reset` },
        );
        if (error || !data?.user) {
          console.error("Erro inviteUserByEmail:", error);
          return new Response(
            JSON.stringify({ error: error?.message ?? "Falha ao convidar usuário." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        userId = data.user.id;
        outcome = "invited";
      }
    } else {
      // 3b) Usuário já existe -> gera link de recuperação
      userId = userByEmail.user.id;
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: emailRaw,
        options: { redirectTo: `${SITE_URL}/reset` },
      });
      if (error) {
        console.error("Erro generateLink(recovery):", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      outcome = "recovery";
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Não foi possível obter o ID do usuário." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // 4) Upsert em profiles
    const { error: profErr } = await supabaseAdmin
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
    if (profErr) {
      console.error("Erro upsert profiles:", profErr);
    }

    // 5) Upsert em clientes (tabela de “usuários/contatos”)
    const { error: cliErr } = await supabaseAdmin
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
    if (cliErr) {
      console.error("Erro upsert clientes:", cliErr);
    }

    // 6) Upsert em acessos_permitidos
    const { error: accErr } = await supabaseAdmin
      .from("acessos_permitidos")
      .upsert(
        {
          email: emailRaw,
          role,
          ativo: true,
          is_deleted: false,
          deleted_at: null,
          is_primary_admin: false,
        },
        { onConflict: "email" },
      );
    if (accErr) {
      console.error("Erro upsert acessos_permitidos:", accErr);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        outcome,
        userId,
        role,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar requisição." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
