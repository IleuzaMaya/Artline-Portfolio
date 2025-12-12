// supabase/functions/admin-update-client/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

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
  id?: string;
  email?: string;
  nome?: string;
  empresa?: string;
  segmento?: string;
  telefone?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const headers = cors(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers });

  try {
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!ADMIN_API_TOKEN || !SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(
        JSON.stringify({
          error: "Missing secrets (ADMIN_API_TOKEN / SUPABASE_URL / SERVICE_ROLE)",
        }),
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

    const { id, email, nome, empresa, segmento, telefone } = body;
    if (!id && !email) {
      return new Response(
        JSON.stringify({ error: "Informe id ou email" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const update: Record<string, unknown> = {};
    if (typeof nome === "string") update.nome = nome;
    if (typeof empresa === "string") update.empresa = empresa;
    if (typeof segmento === "string") update.segmento = segmento;
    if (typeof telefone === "string") update.telefone = telefone;

    if (Object.keys(update).length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true }),
        { headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const emailNorm = email ? String(email).trim().toLowerCase() : null;
    const idIsUuid = !!(id && UUID_RE.test(id));

    let dataUpdated: any = null;

    if (idIsUuid) {
      const { data, error } = await sb
        .from("clientes")
        .update(update)
        .eq("id", id!)
        .select("id,email,nome,empresa,telefone")
        .maybeSingle();
      if (error) throw error;
      dataUpdated = data;
    } else if (emailNorm) {
      const upsertPayload: Record<string, unknown> = { email: emailNorm, ...update };

      const { data, error } = await sb
        .from("clientes")
        .upsert(upsertPayload, { onConflict: "email" })
        .select("id,email,nome,empresa,telefone")
        .maybeSingle();
      if (error) throw error;
      dataUpdated = data;
    } else {
      return new Response(
        JSON.stringify({ error: "Informe id (uuid) ou email válido" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    // Sync profiles quando tiver UUID + nome
    if (idIsUuid && typeof nome === "string") {
      const { error: perr } = await sb
        .from("profiles")
        .upsert({ id: id!, nome }, { onConflict: "id" });
      if (perr) console.warn("profiles sync warn:", perr.message);
    }

    return new Response(
      JSON.stringify({ ok: true, updated: dataUpdated }),
      { headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("admin-update-client FATAL error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }
});
