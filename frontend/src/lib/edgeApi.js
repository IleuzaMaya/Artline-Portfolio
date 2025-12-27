// frontend/src/lib/edgeApi.js
import axios from "axios";
import { ENV } from "./env";

function buildFunctionsBase() {
  const explicit = (ENV.FUNCTIONS_BASE || "").replace(/\/$/, "");
  if (explicit) return explicit;

  const supa = (ENV.SUPABASE_URL || "").replace(/\/$/, "");
  if (!supa) return "";

  return `${supa}/functions/v1`;
}

const FUNCTIONS_BASE = buildFunctionsBase();
const anon = ENV.SUPABASE_ANON_KEY;

// Headers padrão exigidos pelo gateway do Supabase Functions
function baseHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${anon}`,
    apikey: anon,
    "Content-Type": "application/json",
    ...extra,
  };
}

// ✅ Compat: Orçamento usa isso como "api" (catalogo)
export const edge = axios.create({
  baseURL: `${FUNCTIONS_BASE}/catalogo`,
  headers: baseHeaders(),
});

// ✅ Para Admin: chama qualquer function por nome e devolve data
export async function invoke(functionName, payload = {}, extraHeaders = {}) {
  try {
    const url = `${FUNCTIONS_BASE}/${functionName}`;
    const res = await axios.post(url, payload, {
      headers: baseHeaders(extraHeaders),
    });
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    // cria um erro “rico” pro seu try/catch do React entender
    const e = new Error(
      data?.error ||
        data?.message ||
        err?.message ||
        "Erro ao chamar Edge Function"
    );

    e.status = status;
    e.payload = data;
    throw e;
  }
}
