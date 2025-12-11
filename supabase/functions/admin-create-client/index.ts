// supabase/functions/admin-create-client/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const ORIGINS = ["https://app.artemoldurados.com.br", "http://localhost:5173"];

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, apikey, x-client-info, x-admin-token, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
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

serve(async (req) => {
  const headersBase = cors(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: headersBase });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: headersBase,
    });
  }

  try {
    // 1) Carregar secrets
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const PROFILE_TABLE = Deno.env.get("PROFILE_TABLE") ?? "profiles";
    const PROJECT_URL =
      Deno.env.get("PROJECT_URL") ?? "https://app.artemoldurados.com.br";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ADMIN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL / SERVICE_ROLE / ADMIN_API_TOKEN" }),
        { status: 500, headers: { ...headersBase, "Content-Type": "application/json" } }
      );
    }

    // 2) Autorizar pelo token
    const tokenHeader = req.headers.get("x-admin-token") ?? "";
    if (tokenHeader !== ADMIN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Não autorizado (token inválido)." }),
        { status: 401, headers: { ...headersBase, "Content-Type": "application/json" } }
      );
    }

    // 3) Body
    const body = (await req.json()) as BodyPayload;
    const emailRaw = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const telefone = body.telefone ? String(body.telefone).trim() : null;
    const empresa = body.empresa ? String(body.empresa).trim() : null;
    const password = String(body.password ?? "").trim();
    const role: Role = body.role === "admin" ? "admin" : "cliente";

    if (!emailRaw) {
      return new Response(
        JSON.stringify({ error: "E-mail é obrigatório." }),
        { status: 400, headers: { ...headersBase, "Content-Type": "application/json" } }
      );
    }

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Nome é obrigatório." }),
        { status: 400, headers: { ...headersBase, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4) Procurar usuário por e-mail no Auth (reaproveitar se já existir)
    let userId: string | null = null;
    let alreadyExisted = false;

    const listRes = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listRes.error) throw listRes.error;

    const existingUser = listRes.data.users.find(
      (u) => (u.email ?? "").toLowerCase() === emailRaw
    );

    if (existingUser) {
      userId = existingUser.id;
      alreadyExisted = true;
    } else {
      // 4b) Não existe → criar usuário
      const createRes = await supabaseAdmin.auth.admin.createUser({
        email: emailRaw,
        password: password || undefined,
        email_confirm: true,
      });
      if (createRes.error) throw createRes.error;
      userId = createRes.data.user?.id ?? null;
      alreadyExisted = false;
    }

    if (!userId) {
      throw new Error("Não foi possível obter o ID do usuário.");
    }

    // 5) Upsert em profiles
    const upsertProfile = await supabaseAdmin
      .from(PROFILE_TABLE)
      .upsert(
        {
          id: userId,
          nome: name,
          telefone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id")
      .single();

    if (upsertProfile.error) throw upsertProfile.error;

    // 6) Upsert em clientes
    const upsertCliente = await supabaseAdmin
      .from("clientes")
      .upsert(
        {
          id: userId,
          email: emailRaw,
          nome: name,
          telefone,
          empresa,
        },
        { onConflict: "id" }
      )
      .select("id")
      .single();

    if (upsertCliente.error) throw upsertCliente.error;

    // 7) Upsert em acessos_permitidos (reaproveita se já existir esse e-mail)
    const upsertAcesso = await supabaseAdmin
      .from("acessos_permitidos")
      .upsert(
        {
          email: emailRaw,
          role,
          ativo: true,
          is_deleted: false,
        },
        { onConflict: "email" }
      )
      .select("email, role, ativo")
      .single();

    if (upsertAcesso.error) throw upsertAcesso.error;

    // 8) Se não recebeu senha → gerar link de convite (signup)
    let invite_link: string | null = null;
    if (!password) {
      const gen = await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email: emailRaw,
        options: { redirectTo: PROJECT_URL },
      });
      if (gen.error) throw gen.error;
      invite_link = gen.data?.properties?.action_link ?? null;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        email: emailRaw,
        role,
        alreadyExisted,
        invite_link,
      }),
      { status: 200, headers: { ...headersBase, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("admin-create-client error:", e);
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e) }),
      {
        status: 500,
        headers: {
          ...cors(req.headers.get("origin")),
          "Content-Type": "application/json",
        },
      }
    );
  }
});
