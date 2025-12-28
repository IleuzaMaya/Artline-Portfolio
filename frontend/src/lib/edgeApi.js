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

const functionsBase = buildFunctionsBase();
const anon = ENV.SUPABASE_ANON_KEY;

function assertFunctionsBase() {
  if (!functionsBase) {
    throw new Error(
      "FUNCTIONS_BASE indefinida. Verifique VITE_SUPABASE_FUNCTIONS_URL ou VITE_SUPABASE_URL."
    );
  }
  if (!anon) {
    throw new Error("SUPABASE_ANON_KEY indefinida. Verifique VITE_SUPABASE_ANON_KEY.");
  }
}

// ✅ axios do catálogo (mantém compat com o Orcamento.jsx)
export const edge = axios.create({
  baseURL: `${functionsBase}/catalogo`,
  headers: {
    Authorization: `Bearer ${anon}`,
    apikey: anon,
    "Content-Type": "application/json",
  },
});

// ✅ adiciona invoke NO MESMO edge (resolve adminApi sem quebrar orçamento)
edge.invoke = async function invoke(fnName, body = {}, extraHeaders = {}) {
  assertFunctionsBase();

  const url = `${functionsBase}/${fnName}`;
  const headers = {
    Authorization: `Bearer ${anon}`,
    apikey: anon,
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  try {
    const res = await axios.post(url, body, { headers });
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const payload = err?.response?.data;
    const message = payload?.error || err?.message || "Erro na Edge Function";

    const e = new Error(message);
    e.status = status;
    e.payload = payload;
    throw e;
  }
};
