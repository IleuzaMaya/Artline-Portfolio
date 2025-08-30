// supabase/functions/catalogo/index.ts
import { createClient } from "@supabase/supabase-js";

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin || Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
});

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function json(data: unknown, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req.headers.get("origin")) }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
  }

  try {
    const { pathname, searchParams } = new URL(req.url);
    const after = pathname.split("/catalogo")[1] || "/";
    const resource = after.replace(/^\/+/, "").toLowerCase();

    if (resource === "" || resource === "/") {
      return json({ ok: true, msg: "catalogo alive" }, req);
    }

    const simple = async (table: string) => {
      const { data, error } = await supabase.from(table).select("*");
      if (error) return json({ error: error.message }, req, 500);
      return json(data ?? [], req);
    };

    if (resource === "tipos-orcamento") {
      const { data, error } = await supabase
        .from("tipos_orcamento")
        .select("*")
        .order("id", { ascending: true });
      if (error) return json({ error: error.message }, req, 500);
      return json(data ?? [], req);
    }

    if (resource.startsWith("molduras")) {
      const uso = searchParams.get("uso") || "superficie";
      const permiteA = searchParams.has("permiteA");

      const colByUso: Record<string, string> = {
        superficie: "uso_superficie",
        tela: "uso_tela",
        flutuante: "uso_flutuante",
        profundidade: "uso_profundidade",
        entre_vidros: "uso_entre_vidros",
        camisa: "uso_camisa_objeto"
      };
      const col = colByUso[uso] || "uso_superficie";

      let q = supabase.from("mt_molduras").select("*").eq(col, true);
      if (uso === "camisa" && !permiteA) q = q.neq("uso_tipo", "A");

      const { data, error } = await q.order("codigo_principal", { ascending: true });
      if (error) return json({ error: error.message }, req, 500);
      return json(data ?? [], req);
    }

    if (resource === "vidros")        return simple("mt_vidros");
    if (resource === "fundos")        return simple("mt_fundos");
    if (resource === "passepartouts") return simple("mt_passepartouts");
    if (resource === "baguetes")      return simple("mt_baguetes");
    if (resource === "impressoes")    return simple("mt_impressoes");
    if (resource === "camisas")       return simple("mt_camisa_objeto");
    if (resource === "chassis")       return simple("mt_chassis");
    if (resource === "diversos")      return simple("mt_diversos");

    return json({ error: `Not found: ${resource}` }, req, 404);
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, req, 500);
  }
});
