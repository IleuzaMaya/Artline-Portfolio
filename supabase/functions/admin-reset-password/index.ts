//supabase/functions/admin-reset-password/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGINS = ["https://app.artemoldurados.com.br", "http://localhost:5173"];
const cors = (o:string|null)=>({
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
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const DEFAULT_REDIRECT = Deno.env.get("RESET_REDIRECT_TO") ?? "https://app.artemoldurados.com.br/reset";
    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return new Response(JSON.stringify({ error: "Missing secrets" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" }});
    }

    const token = req.headers.get("x-admin-token") ?? "";
    if (token !== ADMIN_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...headers, "Content-Type": "application/json" }});
    }

    const { email, redirectTo } = await req.json();
    const normalizeEmail = String(email || "").trim().toLowerCase();
    if (!normalizeEmail) {
      return new Response(JSON.stringify({ error: "email é obrigatório" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" }});
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const gen = await sb.auth.admin.generateLink({
      type: "recovery",
      email: normalizeEmail,
      options: { redirectTo: redirectTo || DEFAULT_REDIRECT },
    });
    if (gen.error) {
      const msg = String(gen.error.message || "");
      if (msg.toLowerCase().includes("user not found")) {
        return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { status: 404, headers: { ...headers, "Content-Type": "application/json" }});
      }
      throw gen.error;
    }

    const link = gen.data?.properties?.action_link ?? null;

    return new Response(JSON.stringify({ ok: true, action_link: link }), { headers: { ...headers, "Content-Type": "application/json" }});
  } catch (e) {
    console.error("admin-reset-password:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...headers, "Content-Type": "application/json" }});
  }
});
