import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGINS = ["https://app.artemoldurados.com.br", "http://localhost:5173"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": (o && ORIGINS.includes(o)) ? o : ORIGINS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, x-admin-token, content-type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });

  try {
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SERVICE_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") ?? "";
    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return new Response(JSON.stringify({ error: "Missing secrets" }), {
        status: 500, headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const token = req.headers.get("x-admin-token") ?? "";
    if (token !== ADMIN_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const { email, ativo, role } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email é obrigatório" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // upsert em acessos_permitidos
    const fields: Record<string, any> = { email };
    if (typeof ativo === "boolean") fields.ativo = ativo;
    if (role) fields.role = role;
    const { error: upErr } = await sb.from("acessos_permitidos").upsert(fields, { onConflict: "email" });
    if (upErr) throw upErr;

    // refletir role em profiles.tipo (se acharmos o user por email)
    const { data: page } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    const user = page?.users?.find(u => u.email === email);
    if (user && role) {
      const { error: pErr } = await sb.from("profiles").upsert({ id: user.id, tipo: role }, { onConflict: "id" });
      if (pErr) throw pErr;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-set-access:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" }
    });
  }
});
