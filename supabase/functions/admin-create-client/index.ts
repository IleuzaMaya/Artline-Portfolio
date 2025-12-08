// supabase/functions/admin-create-client/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGINS = ["https://app.artemoldurados.com.br", "http://localhost:5173"];

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": (origin && ORIGINS.includes(origin)) ? origin : ORIGINS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-admin-token",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

serve(async (req) => {
  const headers = cors(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });

  try {
    // 🔐 Carrega segredos
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return new Response(JSON.stringify({ error: "Missing secrets" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // 🔐 Valida o token de admin recebido do frontend
    const token = req.headers.get("x-admin-token") ?? "";
    if (token !== ADMIN_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = body?.password?.trim() || null;
    const tipoAcesso = body?.tipoAcesso || "Cliente";
    const empresa = body?.empresa || null;
    const telefone = body?.telefone || null;

    if (!email || !name) {
      return new Response(JSON.stringify({ error: "Nome e e-mail são obrigatórios" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // 🔵 Cria client com service_role
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 🔍 Buscar usuário por e-mail — forma correta no Supabase v2
    const existing = await supabaseAdmin.auth.admin.listUsers({
      email: email,
    });

    if (existing?.data?.users?.length > 0) {
      return new Response(JSON.stringify({ error: "E-mail já cadastrado" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Criar usuário — invita se não tiver senha
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: {
        name,
        empresa,
        telefone,
        tipoAcesso,
      },
    });

    if (created.error) {
      throw created.error;
    }

    const uid = created.data.user?.id;

    // Criar profile no schema público
    await supabaseAdmin.from("profiles").insert({
      id: uid,
      nome: name,
      telefone,
      tipo: tipoAcesso.toLowerCase(),
    });

    return new Response(
      JSON.stringify({ ok: true, id: uid }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("admin-create-client error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
