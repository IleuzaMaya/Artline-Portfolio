import { createClient } from "@supabase/supabase-js";

const cors = (origin?: string | null) => ({
  "Access-Control-Allow-Origin": origin || Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
});

function send(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors(req.headers.get("origin")) },
  });
}

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
  }
  try {
    const { searchParams } = new URL(req.url);
    const tipo = (searchParams.get("tipo") || "matte").toLowerCase();

    const { data, error } = await db
      .from("mt_reforco")
      .select("*")
      .or(`tipo.is.null,tipo.eq.${tipo}`)
      .order("largura_min_cm", { ascending: true });

    if (error?.message?.includes("does not exist")) return send(req, [], 200);
    if (error) return send(req, { error: error.message }, 500);
    return send(req, Array.isArray(data) ? data : [], 200);
  } catch (e) {
    return send(req, { error: String(e?.message ?? e) }, 500);
  }
});
