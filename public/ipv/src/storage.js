/**
 * src/storage.js
 * Capa de almacenamiento persistente para la aplicación IPV.
 *
 * Prioriza `window.storage` (API de artefactos Claude) cuando está disponible,
 * y hace fallback a `localStorage` (para uso local del archivo descargado).
 *
 * Todas las operaciones de lectura son asíncronas.
 * saveCurrent() es fire-and-forget con una cola para evitar carreras.
 *
 * Expone:
 *   PASSWORD              — contraseña del panel evaluador
 *   HAS_STORAGE, USE_WINDOW_STORAGE  — flags de diagnóstico
 *   saveCurrent(), loadCurrent(), clearCurrent()  — sesión en curso
 *   getCompleted(), pushCompleted(), deleteCompleted(), importCompleted()
 *   saveChain             — Promise en curso del último saveCurrent
 */

const PASSWORD = "RRhH.26BPS";

/* =========================================================
   ALMACENAMIENTO PERSISTENTE
   Prioridad: window.storage (artefactos Claude) -> localStorage
   (para el archivo descargado). Ambas APIs se abstraen aquí.
   ========================================================= */
const STORAGE_CURRENT = "ipv_current_session_v1";
const STORAGE_COMPLETED = "ipv_completed_sessions_v1";

const USE_WINDOW_STORAGE = (typeof window !== "undefined") && !!window.storage;

let LOCALSTORAGE_OK = false;
try {
  const k = "__ipv_ok__";
  localStorage.setItem(k, k);
  localStorage.removeItem(k);
  LOCALSTORAGE_OK = true;
} catch (e) { LOCALSTORAGE_OK = false; }

const HAS_STORAGE = USE_WINDOW_STORAGE || LOCALSTORAGE_OK;

// Abstracción async — el resultado es siempre una Promise.
async function storageGet(key) {
  if (USE_WINDOW_STORAGE) {
    try {
      const r = await window.storage.get(key, true); // shared=true: postulante y evaluador comparten datos
      return r ? r.value : null;
    } catch (e) { return null; }
  }
  if (LOCALSTORAGE_OK) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  return null;
}
async function storageSet(key, value) {
  if (USE_WINDOW_STORAGE) {
    try { await window.storage.set(key, value, true); return true; }
    catch (e) { console.warn("window.storage.set falló:", e); return false; }
  }
  if (LOCALSTORAGE_OK) {
    try { localStorage.setItem(key, value); return true; }
    catch (e) { return false; }
  }
  return false;
}
async function storageDelete(key) {
  if (USE_WINDOW_STORAGE) {
    try { await window.storage.delete(key, true); return true; } catch (e) { return false; }
  }
  if (LOCALSTORAGE_OK) {
    try { localStorage.removeItem(key); return true; } catch (e) { return false; }
  }
  return false;
}

// Cola simple para evitar carreras: cada saveCurrent espera a la anterior.
let saveChain = Promise.resolve();
function saveCurrent() {
  if (!HAS_STORAGE) return;
  const payload = JSON.stringify({
    postulante: state.postulante,
    respuestas: state.respuestas,
    lastUpdate: new Date().toISOString()
  });
  saveChain = saveChain.then(() => storageSet(STORAGE_CURRENT, payload)).catch(() => {});
}

async function loadCurrent() {
  const raw = await storageGet(STORAGE_CURRENT);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

async function clearCurrent() {
  await storageDelete(STORAGE_CURRENT);
}

async function getCompleted() {
  const raw = await storageGet(STORAGE_COMPLETED);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

async function pushCompleted(session) {
  const list = await getCompleted();
  const record = {
    id: "ipv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    postulante: session.postulante,
    respuestas: session.respuestas,
    completedAt: new Date().toISOString()
  };
  list.push(record);
  await storageSet(STORAGE_COMPLETED, JSON.stringify(list));
  return record.id;
}

async function deleteCompleted(id) {
  const list = await getCompleted();
  const filtered = list.filter(s => s.id !== id);
  await storageSet(STORAGE_COMPLETED, JSON.stringify(filtered));
}

async function importCompleted(sessions) {
  const current = await getCompleted();
  const existingIds = new Set(current.map(s => s.id));
  let added = 0;
  sessions.forEach(s => {
    if (s && s.id && s.postulante && s.respuestas && !existingIds.has(s.id)) {
      current.push(s);
      added++;
    }
  });
  await storageSet(STORAGE_COMPLETED, JSON.stringify(current));
  return added;
}
