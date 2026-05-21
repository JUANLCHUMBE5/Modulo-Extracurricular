import { createClient } from "@supabase/supabase-js";
import { initialData } from "../../src/services/localDbClient.js";

const jsonHeaders = {
  "Content-Type": "application/json",
};

const DEFAULT_ROW_ID = "modulo-extracurricular";
const DEFAULT_TABLE = "modulo_pilot_database";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return response(204, null);
  }

  try {
    if (event.httpMethod === "GET") {
      return response(200, await getSupabaseDb());
    }

    if (event.httpMethod === "PUT") {
      const body = parseBody(event.body);
      return response(200, await saveSupabaseDb(body));
    }

    if (event.httpMethod === "POST" && event.path.endsWith("/reset")) {
      return response(200, await resetSupabaseDb());
    }

    return response(405, { message: "Metodo no permitido." });
  } catch (error) {
    return response(500, {
      message: error?.message || "No se pudo conectar con Supabase.",
    });
  }
}

async function getSupabaseDb() {
  const { client, table, rowId } = getSupabaseConfig();
  const { data, error } = await client
    .from(table)
    .select("data")
    .eq("id", rowId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer Supabase: ${error.message}`);
  if (!data?.data) return saveSupabaseDb(clone(initialData));

  return mergeWithDefaults(data.data, clone(initialData));
}

async function saveSupabaseDb(data) {
  const { client, table, rowId } = getSupabaseConfig();
  const db = mergeWithDefaults(data || {}, clone(initialData));
  const { error } = await client
    .from(table)
    .upsert({
      id: rowId,
      data: db,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) throw new Error(`No se pudo guardar Supabase: ${error.message}`);
  return db;
}

async function resetSupabaseDb() {
  return saveSupabaseDb(clone(initialData));
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en Netlify.");
  }

  return {
    client: createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    table: process.env.SUPABASE_PILOT_TABLE || DEFAULT_TABLE,
    rowId: process.env.SUPABASE_PILOT_ROW_ID || DEFAULT_ROW_ID,
  };
}

function mergeWithDefaults(stored, defaults) {
  return {
    ...defaults,
    ...stored,
    categorias: stored.categorias || defaults.categorias,
    estudiantes: { ...defaults.estudiantes, ...(stored.estudiantes || {}) },
    programas: stored.programas || defaults.programas,
    invitadosPorPrograma: {
      ...defaults.invitadosPorPrograma,
      ...(stored.invitadosPorPrograma || {}),
    },
    inscripciones: stored.inscripciones || defaults.inscripciones,
    documentosGenerados: stored.documentosGenerados || defaults.documentosGenerados,
    pagos: stored.pagos || defaults.pagos,
    asistencias: stored.asistencias || defaults.asistencias,
    historialCargas: stored.historialCargas || defaults.historialCargas,
    usuarios: stored.usuarios || defaults.usuarios,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseBody(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function response(statusCode, data) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: data == null ? "" : JSON.stringify(data),
  };
}
