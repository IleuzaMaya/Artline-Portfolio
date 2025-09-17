// supabase/functions/admin-update-client/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  id?: string;            // UUID do user (opcional)
  email?: string;         // email (opcional, obrigatório se não tiver id)
  nome?: string;          // campos opcionais a atualizar
  empresa?: string;
  segmento?: string;
  telefone?: string;
};

serve(async (req) => {
  const headers = cors(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  try {
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!ADMIN_API_TOKEN || !SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(
        JSON.stringify({ error: "Missing secrets" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    // Auth simples via cabeçalho
    if ((req.headers.get("x-admin-token") ?? "") !== ADMIN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const body: Body = await req.json().catch(() => ({} as Body));
    const { id, email, nome, empresa, segmento, telefone } = body;

    if (!id && !email) {
      return new Response(
        JSON.stringify({ error: "Informe id ou email" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Monta apenas os campos enviados
    const update: Record<string, string> = {};
    if (typeof nome === "string") update.nome = nome;
    if (typeof empresa === "string") update.empresa = empresa;
    if (typeof segmento === "string") update.segmento = segmento;
    if (typeof telefone === "string") update.telefone = telefone;

    // Nada a atualizar? retorna ok
    if (Object.keys(update).length === 0) {
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    // Atualiza clientes por id OU email
    let q = sb.from("clientes").update(update);
    if (id) q = q.eq("id", id);
    else q = q.eq("email", String(email).trim().toLowerCase());

    const { error } = await q;
    if (error) throw error;

    // Mantém profiles.nome em sincronia quando houver id + nome
    if (id && typeof nome === "string") {
      const { error: perr } = await sb.from("profiles")
        .upsert({ id, nome }, { onConflict: "id" });
      if (perr) {
        // apenas loga; não quebra a resposta principal
        console.warn("profiles sync warn:", perr.message);
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("admin-update-client error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }
});
