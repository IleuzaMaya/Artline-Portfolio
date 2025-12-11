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

type Role = "admin" | "cliente";

type Body = {
  id?: string;            // UUID do usuário (auth / profiles / clientes)
  email?: string;         // email (opcional, mas a função tenta descobrir)
  nome?: string;
  empresa?: string | null;
  telefone?: string | null;
  role?: Role;
  ativo?: boolean;
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
        JSON.stringify({ error: "Missing SUPABASE_URL / SERVICE_ROLE / ADMIN_API_TOKEN" }),
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

    const body = (await req.json().catch(() => ({}))) as Body;
    let { id, email, nome, empresa, telefone, role, ativo } = body;

    if (!id && !email) {
      return new Response(
        JSON.stringify({ error: "Informe id ou email" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    // Normaliza email (se vier)
    email = email ? String(email).trim().toLowerCase() : undefined;

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Se não veio email, tenta descobrir pelos clientes
    let targetEmail = email ?? null;
    if (!targetEmail && id) {
      const { data: row, error: findErr } = await sb
        .from("clientes")
        .select("email")
        .eq("id", id)
        .maybeSingle();

      if (findErr) {
        console.error("find clientes by id error:", findErr.message);
        return new Response(
          JSON.stringify({ error: "Erro ao localizar cliente pelo id." }),
          { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
      targetEmail = row?.email ? String(row.email).toLowerCase() : null;
    }

    if (!targetEmail) {
      return new Response(
        JSON.stringify({ error: "Não foi possível determinar o e-mail do usuário." }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    // --- Atualiza tabela CLIENTES ---
    const updateClientes: Record<string, unknown> = {};
    if (typeof nome === "string") updateClientes.nome = nome;
    if (typeof empresa === "string" || empresa === null) updateClientes.empresa = empresa;
    if (typeof telefone === "string" || telefone === null) updateClientes.telefone = telefone;

    if (Object.keys(updateClientes).length > 0) {
      let q = sb.from("clientes").update(updateClientes);
      if (id) q = q.eq("id", id);
      else q = q.eq("email", targetEmail);

      const { error: upErr } = await q;
      if (upErr) {
        console.error("update clientes error:", upErr.message);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar dados do cliente." }),
          { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
    }

    // --- Atualiza tabela ACESSOS_PERMITIDOS (role / ativo) ---
    const updateAcessos: Record<string, unknown> = {};
    if (role === "admin" || role === "cliente") updateAcessos.role = role;
    if (typeof ativo === "boolean") updateAcessos.ativo = ativo;

    if (Object.keys(updateAcessos).length > 0) {
      const { error: accErr } = await sb
        .from("acessos_permitidos")
        .update(updateAcessos)
        .eq("email", targetEmail);

      if (accErr) {
        console.error("update acessos_permitidos error:", accErr.message);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar permissões de acesso." }),
          { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }
    }

    // --- Mantém profiles.nome em sincronia (se tiver id + nome) ---
    if (id && typeof nome === "string") {
      const { error: profErr } = await sb
        .from("profiles")
        .upsert({ id, nome }, { onConflict: "id" });

      if (profErr) {
        console.warn("profiles sync warn:", profErr.message);
        // Não quebra a resposta principal
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
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
