import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGINS = ["https://app.artemoldurados.com.br", "http://localhost:5173"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
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
        status: 500, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // auth
    if ((req.headers.get("x-admin-token") ?? "") !== ADMIN_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body.email;
    const id: string | undefined    = body.id;
    const password: string | undefined = body.password;

    if (!password || password.length < 8) {
      return new Response(JSON.stringify({ error: "Senha inválida (mín. 8 caracteres)" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (!email && !id) {
      return new Response(JSON.stringify({ error: "Informe id OU email" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // resolve UID
    let uid = id ?? null;
    if (!uid && email) {
      const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 2000 });
      const u = data?.users?.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
      uid = u?.id ?? null;
    }
    if (!uid) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { error } = await sb.auth.admin.updateUserById(uid, { password });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-set-password:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
