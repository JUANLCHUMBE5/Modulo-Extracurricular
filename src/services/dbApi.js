import { localDbApi } from "./apiClient";
import { mockDb, resetMockDb, saveMockDb, syncMockDbFromStorage } from "./localDbClient";

export const apiDb = {};

export async function syncApiDb() {
  try {
    const db = await localDbApi.getDatabase();
    replaceApiDb(db);
  } catch {
    const db = await syncMockDbFromStorage();
    replaceApiDb(db);
  }
  return apiDb;
}

export async function saveApiDb() {
  try {
    const db = await localDbApi.saveDatabase(apiDb);
    replaceApiDb(db);
  } catch {
    replaceMockDb(apiDb);
    await saveMockDb();
    replaceApiDb(mockDb);
  }
  dispatchApiDbUpdated();
  return apiDb;
}

export async function resetApiDb() {
  try {
    const db = await localDbApi.resetDatabase();
    replaceApiDb(db);
  } catch {
    await resetMockDb();
    replaceApiDb(mockDb);
  }
  dispatchApiDbUpdated();
  return apiDb;
}

export function nextApiId(key) {
  const value = Number(apiDb[key] || 1);
  apiDb[key] = value + 1;
  return value;
}

function replaceApiDb(db) {
  Object.keys(apiDb).forEach((key) => {
    delete apiDb[key];
  });
  Object.assign(apiDb, db || {});
}

function replaceMockDb(db) {
  Object.keys(mockDb).forEach((key) => {
    delete mockDb[key];
  });
  Object.assign(mockDb, db || {});
}

function dispatchApiDbUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("api-db-updated"));
}
