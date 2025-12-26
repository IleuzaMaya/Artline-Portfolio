//supabase/functions/ping/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o ?? "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Cache-Control": "no-store",
});

serve((req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  return new Response("ok", { headers });
});
