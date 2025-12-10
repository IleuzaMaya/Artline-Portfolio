// supabase/functions/admin-list-accounts/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGINS = ["https://app.artemoldurados.com.br", "http://localhost:5173"];

const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, apikey, x-client-info, x-admin-token, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

serve(async (req) => {
  const headers = cors(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers,
    });
  }

  try {
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return new Response(
        JSON.stringify({ error: "Missing secrets" }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const token = req.headers.get("x-admin-token") ?? "";
    if (token !== ADMIN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) pega lista de acessos
    const { data: acessos, error: errAcessos } = await supabaseAdmin
      .from("acessos_permitidos")
      .select("*")
      .eq("is_deleted", false);

    if (errAcessos) {
      console.error("admin-list-accounts acessos_permitidos:", errAcessos);
      throw errAcessos;
    }

    // 2) pega todos os clientes (nome, telefone, empresa, email)
    const { data: clientes, error: errClientes } = await supabaseAdmin
      .from("clientes")
      .select("*");

    if (errClientes) {
      console.error("admin-list-accounts clientes:", errClientes);
      throw errClientes;
    }

    // 3) monta o array final "accounts"
    const accounts =
      acessos?.map((acc) => {
        const emailAcc = String(acc.email || "").toLowerCase();

        const cli =
          clientes?.find((c: any) =>
            String(c.email || "").toLowerCase() === emailAcc
          ) ?? null;

        return {
          id: cli?.id ?? emailAcc, // usa id do cliente se tiver, senão o próprio e-mail
          email: emailAcc,
          role: acc.role, // "admin" | "cliente"
          ativo: acc.ativo,
          is_primary_admin: acc.is_primary_admin ?? false,
          created_at: acc.created_at,

          // dados extras para edição
          nome: cli?.nome ?? null,
          telefone: cli?.telefone ?? null,
          empresa: cli?.empresa ?? null,
        };
      }) ?? [];

    // só pra debug se precisar no futuro
    console.log("admin-list-accounts ->", accounts.length, "accounts");

    return new Response(
      JSON.stringify({ accounts }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("admin-list-accounts error:", e);
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e) }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
