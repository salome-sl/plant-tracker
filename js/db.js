// db.js — IndexedDB storage layer (local-first, private, offline).
//
// Two object stores:
//   plants  { id, name, speciesId, latin, location, potSize, light,
//             acquiredDate, photo, profile{...}, createdAt }
//   events  { id, plantId, type, date, notes, photo?, health?, amount? }
//
// Photos are stored inline as small JPEG data URLs (resized before saving).
// Settings live in localStorage (see settings.js).

const DB_NAME = 'plant-tracker';
const DB_VERSION = 2;

let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('plants')) {
        db.createObjectStore('plants', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('events')) {
        const s = db.createObjectStore('events', { keyPath: 'id' });
        s.createIndex('plantId', 'plantId', { unique: false });
      }
      // v2: a library of user-saved (AI looked-up) species.
      if (!db.objectStoreNames.contains('species')) {
        db.createObjectStore('species', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode) {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function uid(prefix = 'id') {
  // Time-ordered-ish unique id without needing crypto in every context.
  const rand = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

// ---- Plants -------------------------------------------------------------

export async function getPlants() {
  const store = await tx('plants', 'readonly');
  const all = await reqToPromise(store.getAll());
  return all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function getPlant(id) {
  const store = await tx('plants', 'readonly');
  return reqToPromise(store.get(id));
}

export async function putPlant(plant) {
  const store = await tx('plants', 'readwrite');
  await reqToPromise(store.put(plant));
  return plant;
}

export async function deletePlant(id) {
  // Remove the plant and all its events.
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const t = db.transaction(['plants', 'events'], 'readwrite');
    t.objectStore('plants').delete(id);
    const idx = t.objectStore('events').index('plantId');
    const cursorReq = idx.openCursor(IDBKeyRange.only(id));
    cursorReq.onsuccess = (e) => {
      const cur = e.target.result;
      if (cur) { cur.delete(); cur.continue(); }
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// ---- Events -------------------------------------------------------------

export async function getEvents(plantId = null) {
  const store = await tx('events', 'readonly');
  let all;
  if (plantId) {
    all = await reqToPromise(store.index('plantId').getAll(plantId));
  } else {
    all = await reqToPromise(store.getAll());
  }
  return all.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function putEvent(event) {
  const store = await tx('events', 'readwrite');
  await reqToPromise(store.put(event));
  return event;
}

export async function deleteEvent(id) {
  const store = await tx('events', 'readwrite');
  await reqToPromise(store.delete(id));
}

// ---- Custom species library ---------------------------------------------

export async function getCustomSpecies() {
  const store = await tx('species', 'readonly');
  return reqToPromise(store.getAll());
}

export async function putCustomSpecies(species) {
  const store = await tx('species', 'readwrite');
  await reqToPromise(store.put(species));
  return species;
}

export async function deleteCustomSpecies(id) {
  const store = await tx('species', 'readwrite');
  await reqToPromise(store.delete(id));
}

// ---- Backup / restore ---------------------------------------------------

export async function exportAll() {
  const [plants, events, species] = await Promise.all([getPlants(), getEvents(), getCustomSpecies()]);
  return {
    app: 'plant-tracker',
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    plants,
    events,
    species,
  };
}

export async function importAll(data, { merge = false } = {}) {
  if (!data || data.app !== 'plant-tracker') {
    throw new Error('This file is not a Plant Tracker backup.');
  }
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const t = db.transaction(['plants', 'events', 'species'], 'readwrite');
    if (!merge) {
      t.objectStore('plants').clear();
      t.objectStore('events').clear();
      t.objectStore('species').clear();
    }
    for (const p of data.plants || []) t.objectStore('plants').put(p);
    for (const e of data.events || []) t.objectStore('events').put(e);
    for (const s of data.species || []) t.objectStore('species').put(s);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
