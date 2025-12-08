// supabase/functions/admin-create-client/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
const PROFILE_TABLE = Deno.env.get("PROFILE_TABLE") ?? "profiles";
const PROJECT_URL =
  Deno.env.get("PROJECT_URL") ?? "https://app.artemoldurados.com.br";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

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
  const origin = req.headers.get("origin");
  const baseHeaders = cors(origin);

  // Pré-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: baseHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: baseHeaders,
    });
  }

  try {
    // 1) Autorização por token
    const token = req.headers.get("x-admin-token") ?? "";
    if (!ADMIN_API_TOKEN) {
      console.error("ADMIN_API_TOKEN ausente nas secrets");
      return new Response(
        JSON.stringify({ error: "Configuração de token ausente" }),
        {
          status: 500,
          headers: { ...baseHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!token || token !== ADMIN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Não autorizado (token inválido)." }),
        {
          status: 401,
          headers: { ...baseHeaders, "Content-Type": "application/json" },
        }
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
        {
          status: 400,
          headers: { ...baseHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3) Verifica se já existe usuário com esse e-mail
    const existing = await supabaseAdmin.auth.admin.getUserByEmail(emailRaw);
    if (existing.error && existing.error.message !== "User not found") {
      console.error("getUserByEmail error:", existing.error);
      throw existing.error;
    }

    let userId: string | null = existing.data?.user?.id ?? null;

    // 4) Cria / convida usuário
    if (!userId) {
      if (password) {
        // cria usuário com senha
        const created = await supabaseAdmin.auth.admin.createUser({
          email: emailRaw,
          password,
          email_confirm: true,
          user_metadata: { name },
        });
        if (created.error) {
          console.error("createUser error:", created.error);
          throw created.error;
        }
        userId = created.data.user?.id ?? null;
      } else {
        // envia convite (link de cadastro)
        const invited = await supabaseAdmin.auth.admin.inviteUserByEmail(
          emailRaw,
          {
            data: { name },
            redirectTo: `${PROJECT_URL}/reset`,
          }
        );
        if (invited.error) {
          console.error("inviteUserByEmail error:", invited.error);
          throw invited.error;
        }
        userId = invited.data.user?.id ?? null;
      }
    }

    if (!userId) {
      throw new Error("Não foi possível obter o id do usuário.");
    }

    // 5) Upsert em profiles
    const { error: profError } = await supabaseAdmin
      .from(PROFILE_TABLE)
      .upsert(
        {
          id: userId,
          nome: name || emailRaw,
          telefone: telefone || null,
          tipo: role,
        },
        { onConflict: "id" }
      );
    if (profError) {
      console.error("profiles upsert error:", profError);
      throw profError;
    }

    // 6) Upsert em clientes
    const { error: cliError } = await supabaseAdmin
      .from("clientes")
      .upsert(
        {
          id: userId,
          email: emailRaw,
          nome: name || emailRaw,
          telefone: telefone || null,
          empresa: empresa || null,
        },
        { onConflict: "id" }
      );
    if (cliError) {
      console.error("clientes upsert error:", cliError);
      throw cliError;
    }

    // 7) Upsert em acessos_permitidos
    const { error: accError } = await supabaseAdmin
      .from("acessos_permitidos")
      .upsert(
        {
          email: emailRaw,
          role,
          ativo: true,
          is_deleted: false,
        },
        { onConflict: "email" }
      );
    if (accError) {
      console.error("acessos_permitidos upsert error:", accError);
      throw accError;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user_id: userId,
        email: emailRaw,
        role,
      }),
      { headers: { ...baseHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("admin-create-client:", e);
    return new Response(
      JSON.stringify({ error: String((e as any)?.message ?? e) }),
      {
        status: 500,
        headers: { ...cors(req.headers.get("origin")), "Content-Type": "application/json" },
      }
    );
  }
});
