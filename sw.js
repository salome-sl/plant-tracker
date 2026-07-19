// sw.js — Service worker for offline support and installability.
//
// Strategy: cache-first for the app shell (it's fully static), so the app
// opens instantly and works with no network. Bump CACHE when files change.

const CACHE = 'plant-tracker-v31';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/species.js',
  './js/season.js',
  './js/schedule.js',
  './js/diagnostics.js',
  './js/settings.js',
  './js/util.js',
  './js/coach.js',
  './js/ai.js',
  './js/handoff.js',
  './js/i18n.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // Fetch with cache:'reload' so a version bump always pulls fresh files,
      // never a stale copy from the browser's HTTP cache.
      .then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))),
    // NOTE: no skipWaiting() here — the new worker waits so the app can prompt
    // the user to update, rather than swapping code out from under them.
  );
});

// The page asks us to activate immediately when the user taps "Update".
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          // Runtime-cache same-origin GETs so newly added files work offline too.
          if (res.ok && new URL(request.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    }),
  );
});

// ---- Background reminders (no server) -----------------------------------

// The app writes a "reminderDigest" into IndexedDB; we just read it here.
function idbGetMeta(key) {
  return new Promise((resolve) => {
    const req = indexedDB.open('plant-tracker');
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) { resolve(null); return; }
      const g = db.transaction('meta', 'readonly').objectStore('meta').get(key);
      g.onsuccess = () => resolve(g.result ? g.result.value : null);
      g.onerror = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  });
}

function idbPutMeta(key, value) {
  return new Promise((resolve) => {
    const req = indexedDB.open('plant-tracker');
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) { resolve(false); return; }
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key, value });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    };
    req.onerror = () => resolve(false);
  });
}

// ---- Shared reminder formatting (mirror of js/app.js; keep in sync) ------
function reminderDayKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function reminderOverdueDays(dueISO, now) {
  const s = (x) => { const y = new Date(x); y.setHours(0, 0, 0, 0); return y.getTime(); };
  return Math.round((s(now) - s(dueISO)) / (24 * 60 * 60 * 1000));
}
function formatReminder(tasks, now, lang) {
  if (!tasks.length) return null;
  const nl = lang === 'nl';
  const verb = nl
    ? { water: 'water geven', fertilize: 'voeden', photo: 'een voortgangsfoto' }
    : { water: 'watering', fertilize: 'feeding', photo: 'a progress photo' };
  const days = (n) => nl ? `${n} dag${n === 1 ? '' : 'en'}` : `${n} day${n === 1 ? '' : 's'}`;
  const ann = tasks.map((t) => ({ ...t, over: reminderOverdueDays(t.due, now) }));
  const title = nl ? '🌿 Plantenzorg' : '🌿 Plant care';
  if (ann.length === 1) {
    const t = ann[0];
    if (t.over >= 1) {
      return nl
        ? { title: `🚨 ${t.name} is te laat`, body: `${days(t.over)} te laat voor ${verb[t.type]} — het loopt gevaar.` }
        : { title: `🚨 ${t.name} is overdue`, body: `${days(t.over)} overdue for ${verb[t.type]} — it's at risk.` };
    }
    return { title, body: nl ? `${t.name} heeft vandaag ${verb[t.type]} nodig.` : `${t.name} needs ${verb[t.type]} today.` };
  }
  const n = (type) => ann.filter((t) => t.type === type).length;
  const parts = [];
  if (n('water')) parts.push(nl ? `${n('water')} water geven` : `${n('water')} to water`);
  if (n('fertilize')) parts.push(nl ? `${n('fertilize')} voeden` : `${n('fertilize')} to feed`);
  if (n('photo')) parts.push(nl ? `${n('photo')} voortgangsfoto${n('photo') > 1 ? "'s" : ''}` : `${n('photo')} progress photo${n('photo') > 1 ? 's' : ''}`);
  let body = `${parts.join(', ')}.`;
  const worst = ann.filter((t) => t.over >= 1).sort((a, b) => b.over - a.over)[0];
  if (worst) body += nl ? ` ${worst.name} is ${days(worst.over)} te laat.` : ` ${worst.name} is ${days(worst.over)} overdue.`;
  return { title, body };
}

async function runDailyReminderCheck() {
  const digest = await idbGetMeta('reminderDigest');
  if (!digest || !Array.isArray(digest.tasks)) return;
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  // Due today or overdue.
  const due = digest.tasks.filter((t) => {
    const d = new Date(t.due); d.setHours(0, 0, 0, 0);
    return d.getTime() <= startToday.getTime();
  });
  if (!due.length) { await idbPutMeta('notifyLog', {}); return; }

  // Once-per-day de-dup, shared with the in-app notifier so the two never
  // double-fire for the same plant on the same day.
  const today = reminderDayKey(now);
  const log = (await idbGetMeta('notifyLog')) || {};
  const fresh = due.filter((t) => log[`${t.plantId}|${t.type}`] !== today);
  const newLog = {};
  for (const t of due) newLog[`${t.plantId}|${t.type}`] = today;
  await idbPutMeta('notifyLog', newLog);
  if (!fresh.length) return;

  const msg = formatReminder(fresh, now, digest.lang || 'en');
  if (!msg) return;
  await self.registration.showNotification(msg.title, {
    body: msg.body,
    tag: 'plant-care-daily',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
  });
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'plant-care-check') event.waitUntil(runDailyReminderCheck());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow ? self.clients.openWindow('./index.html') : undefined;
    }),
  );
});
