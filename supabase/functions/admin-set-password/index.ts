// supabase/functions/admin-set-password/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGINS = ["https://app.artline.com.br", "http://localhost:5173"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, x-admin-token, content-type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
  "Cache-Control": "no-store",
});

serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST")   return new Response("Method not allowed", { status: 405, headers });

  try {
    const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN") ?? "";
    const SERVICE_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") ?? "";
    if (!ADMIN_API_TOKEN || !SERVICE_ROLE || !SUPABASE_URL) {
      return new Response(JSON.stringify({ error: "Missing secrets" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    }

    // admin token
    if ((req.headers.get("x-admin-token") ?? "") !== ADMIN_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const { id, email, password } = await req.json().catch(() => ({}));
    if (!password || String(password).length < 8) {
      return new Response(JSON.stringify({ error: "Senha inválida (mín. 8 caracteres)" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // quem está chamando?
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Sessão não encontrada" }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
    }
    const { data: gu, error: guErr } = await sb.auth.getUser(jwt);
    if (guErr || !gu?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...headers, "Content-Type": "application/json" } });
    }
    const callerId = gu.user.id;

    // resolver UID alvo
    let targetId: string | null = id ?? null;
    if (!targetId && email) {
      const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 2000 });
      const u = data?.users?.find((u) => (u.email || "").toLowerCase() === String(email).toLowerCase());
      targetId = u?.id ?? null;
    }
    if (!targetId) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { status: 404, headers: { ...headers, "Content-Type": "application/json" } });
    }

    // só pode trocar a própria senha
    if (targetId !== callerId) {
      return new Response(JSON.stringify({ error: "Você só pode alterar a sua própria senha" }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const { error } = await sb.auth.admin.updateUserById(targetId, { password });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-set-password:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
  }
});
