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

type Role = "admin" | "cliente";

type Body = {
  id?: string;            // UUID do user (opcional)
  email?: string;         // email (opcional, obrigatório se não tiver id)
  nome?: string;
  empresa?: string | null;
  segmento?: string | null;
  telefone?: string | null;
  role?: Role;            // "admin" | "cliente"
  ativo?: boolean;        // se o acesso está ativo ou não
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
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    // Auth via cabeçalho
    if ((req.headers.get("x-admin-token") ?? "") !== ADMIN_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const body: Body = await req.json().catch(() => ({} as Body));
    const { id, email, nome, empresa, segmento, telefone, role, ativo } = body;

    if (!id && !email) {
      return new Response(
        JSON.stringify({ error: "Informe id ou email" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const normalizedEmail =
      email && String(email).trim().toLowerCase() ? String(email).trim().toLowerCase() : undefined;

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // -----------------------------
    // 1) Atualiza tabela "clientes"
    // -----------------------------
    const updateCliente: Record<string, any> = {};
    if (typeof nome === "string") updateCliente.nome = nome;
    if (typeof empresa === "string" || empresa === null) updateCliente.empresa = empresa;
    if (typeof segmento === "string" || segmento === null) updateCliente.segmento = segmento;
    if (typeof telefone === "string" || telefone === null) updateCliente.telefone = telefone;
    if (normalizedEmail) updateCliente.email = normalizedEmail;

    if (Object.keys(updateCliente).length > 0) {
      let q = sb.from("clientes").update(updateCliente);
      if (id) q = q.eq("id", id);
      else if (normalizedEmail) q = q.eq("email", normalizedEmail);

      const { error } = await q;
      if (error) throw error;
    }

    // -----------------------------
    // 2) Mantém "profiles" em sincronia
    // -----------------------------
    if (id && (nome || telefone || role)) {
      const profileUpdate: Record<string, any> = { id };
      if (typeof nome === "string") profileUpdate.nome = nome;
      if (typeof telefone === "string" || telefone === null) {
        profileUpdate.telefone = telefone;
      }
      if (role === "admin" || role === "cliente") {
        // na sua tabela está como "tipo"
        profileUpdate.tipo = role;
      }

      const { error: perr } = await sb
        .from("profiles")
        .upsert(profileUpdate, { onConflict: "id" });

      if (perr) {
        console.warn("profiles sync warn:", perr.message);
        // não quebra a resposta principal
      }
    }

    // -----------------------------
    // 3) Atualiza "acessos_permitidos"
    // -----------------------------
    if (normalizedEmail && (role || typeof ativo === "boolean")) {
      const accessUpdate: Record<string, any> = {
        email: normalizedEmail,
      };

      if (role === "admin" || role === "cliente") {
        accessUpdate.role = role;
      }
      if (typeof ativo === "boolean") {
        accessUpdate.ativo = ativo;
        // se desativar, podemos marcar is_deleted; se preferir não mexer, remova.
        accessUpdate.is_deleted = !ativo;
      }

      const { error: aerr } = await sb
        .from("acessos_permitidos")
        .upsert(accessUpdate, { onConflict: "email" });

      if (aerr) throw aerr;
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
