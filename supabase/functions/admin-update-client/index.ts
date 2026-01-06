// supabase/functions/admin-update-client/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGINS = ["https://app.artemoldurados.com.br", "http://localhost:5173"];

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, apikey, x-client-info, x-admin-token, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

type Body = {
  user_id?: string;  // uuid do auth.users.id (preferido)
  email?: string;    // fallback
  nome?: string;
  empresa?: string;
  segmento?: string;
  telefone?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normEmail(v: any) {
  return String(v || "").trim().toLowerCase();
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
      return new Response(
        JSON.stringify({ error: "Missing secrets (ADMIN_API_TOKEN / SUPABASE_URL / SERVICE_ROLE)" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const tokenHeader = req.headers.get("x-admin-token") ?? "";
    if (tokenHeader !== ADMIN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized (invalid x-admin-token)" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const rawBody = await req.text();
    let body: Body;
    try {
      body = JSON.parse(rawBody || "{}") as Body;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", rawBody }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const user_id = body.user_id ? String(body.user_id).trim() : "";
    const email = normEmail(body.email);

    if (!user_id && !email) {
      return new Response(
        JSON.stringify({ error: "Informe user_id (uuid) ou email" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const update: Record<string, unknown> = {};
    if (typeof body.nome === "string") update.nome = body.nome;
    if (typeof body.empresa === "string") update.empresa = body.empresa;
    if (typeof body.segmento === "string") update.segmento = body.segmento;
    if (typeof body.telefone === "string") update.telefone = body.telefone;

    if (Object.keys(update).length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const userIdIsUuid = !!(user_id && UUID_RE.test(user_id));

    // ====== atualiza adm_clientes ======
    let updated: any = null;

    if (userIdIsUuid) {
      const { data, error } = await sb
        .from("adm_clientes")
        .update(update)
        .eq("user_id", user_id)
        .select("user_id,email,nome,empresa,telefone,segmento")
        .maybeSingle();
      if (error) throw error;
      updated = data;
    } else if (email) {
      // fallback por email (mantém compatível com casos em que user_id é null)
      const payload: Record<string, unknown> = { email, ...update };

      const { data, error } = await sb
        .from("adm_clientes")
        .upsert(payload, { onConflict: "email" })
        .select("user_id,email,nome,empresa,telefone,segmento")
        .maybeSingle();
      if (error) throw error;
      updated = data;
    } else {
      return new Response(
        JSON.stringify({ error: "Informe user_id (uuid) ou email válido" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    // ====== sync adm_usuarios quando tiver user_id + nome/telefone ======
    if (userIdIsUuid) {
      const upUser: Record<string, unknown> = { id: user_id };
      if (typeof body.nome === "string") upUser.nome = body.nome;
      if (typeof body.telefone === "string") upUser.telefone = body.telefone;

      // só tenta se tiver algo além do id
      if (Object.keys(upUser).length > 1) {
        const { error: uerr } = await sb
          .from("adm_usuarios")
          .upsert(upUser, { onConflict: "id" });
        if (uerr) console.warn("adm_usuarios sync warn:", uerr.message);
      }
    }

    return new Response(JSON.stringify({ ok: true, updated }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("admin-update-client FATAL error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
