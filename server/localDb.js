import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initialData } from "../src/services/localDbClient.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "db.json");

export async function getDb() {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw);
}

export async function saveDb(data) {
  const db = mergeWithDefaults(data || {}, clone(initialData));
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  return db;
}

export async function resetDb() {
  return saveDb(clone(initialData));
}

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await saveDb(clone(initialData));
  }
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
