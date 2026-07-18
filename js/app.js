// app.js — Router, views, and all UI for the Plant Care Tracker.

import { el, clear, fmtDate, fmtRelative, todayISO, toDateInputValue, dateInputToISO, fileToResizedDataURL, download, dataUrlToPngBlob } from './util.js';
import * as db from './db.js';
import { SPECIES, LIGHT, getSpecies, profileFromSpecies, DEFAULT_PROFILE, allSpecies, isCustomSpecies, registerCustomSpecies } from './species.js';
import { SYMPTOMS, getSymptom } from './diagnostics.js';
import { seasonForDate, SEASON_META, seasonalExplanation } from './season.js';
import { waterStatus, feedStatus, overallStatus, dueTasks, effectiveWaterInterval, photoStatus } from './schedule.js';
import { getSettings, saveSettings } from './settings.js';
import { welcomeMessage, careTips, scheduleWarnings } from './coach.js';
import { buildHandoff, parseHandoffImport, SUMMARY_PROMPT } from './handoff.js';
import { analyzePlant, lookupSpeciesCare, hasApiKey, AI_MODELS, AIError } from './ai.js';

const app = document.getElementById('app');

// Bump this (and the CACHE version in sw.js) on every release so users get the
// update prompt and can see which version they're on in Settings.
const APP_VERSION = '1.3.9';

// ---- Install (PWA) ------------------------------------------------------

// Chromium fires `beforeinstallprompt` only when the app actually qualifies to
// install (HTTPS + valid manifest + service worker). We stash it so an in-app
// button can trigger the native install dialog directly.
let deferredInstallPrompt = null;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

async function triggerInstall() {
  if (!deferredInstallPrompt) {
    toast('Install isn’t available here — see the Install section in Settings.');
    return;
  }
  deferredInstallPrompt.prompt();
  try { await deferredInstallPrompt.userChoice; } catch { /* ignore */ }
  deferredInstallPrompt = null;
  render();
}

// ---- App updates --------------------------------------------------------

let swUpdating = false;

// Show a persistent banner when a newer version has been downloaded and is
// ready. Tapping Update activates it and reloads into the new version.
function showUpdatePrompt(waitingWorker) {
  if (document.getElementById('update-banner')) return;
  const banner = el('div', { id: 'update-banner', class: 'update-banner' }, [
    el('span', { class: 'update-msg' }, '🌱 A new version is ready.'),
    el('button', { class: 'update-btn', onClick: () => {
      swUpdating = true;
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } }, 'Update'),
    el('button', { class: 'update-x', title: 'Later', onClick: () => banner.remove() }, '×'),
  ]);
  document.body.append(banner);
}

// ---- Toast --------------------------------------------------------------

let toastTimer;
function toast(msg, actionLabel, action) {
  let t = document.getElementById('toast');
  if (!t) {
    t = el('div', { id: 'toast', class: 'toast' });
    document.body.append(t);
  }
  clear(t);
  t.append(el('span', {}, msg));
  if (actionLabel && action) {
    t.append(el('button', { class: 'toast-action', onClick: () => { action(); hideToast(); } }, actionLabel));
  }
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, actionLabel ? 6000 : 3000);
}
function hideToast() {
  const t = document.getElementById('toast');
  if (t) t.classList.remove('show');
}

// ---- Status pill --------------------------------------------------------

function statusPill(level, label) {
  return el('span', { class: `pill pill-${level}` }, label);
}

const STATE_CLASS = { overdue: 'poor', due: 'watch', soon: 'watch', ok: 'good', paused: 'muted' };

// ---- Router -------------------------------------------------------------

const routes = [];
function route(pattern, handler) { routes.push({ pattern, handler }); }

function navigate(hash) { window.location.hash = hash; }

async function render() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  for (const r of routes) {
    const m = hash.match(r.pattern);
    if (m) {
      clear(app);
      app.scrollTop = 0;
      window.scrollTo(0, 0);
      await r.handler(...m.slice(1));
      updateNav(hash);
      refreshReminderState(); // keep the SW's reminder digest fresh (fire-and-forget)
      return;
    }
  }
  clear(app);
  app.append(el('div', { class: 'view' }, 'Not found'));
}

// Persist a lightweight "what's due" digest that the service worker reads for
// background reminders (it can't run our seasonal math itself).
async function refreshReminderState() {
  try {
    const settings = getSettings();
    const now = new Date();
    const [plants, events] = await Promise.all([db.getPlants(), db.getEvents()]);
    const tasks = dueTasks(plants, events, now, settings.hemisphere, 0)
      .map((t) => ({ name: t.plant.name, type: t.type, due: t.due.toISOString() }));
    const photoDue = plants.filter((p) => photoStatus(p, events, now).due)
      .map((p) => ({ name: p.name, type: 'photo', due: now.toISOString() }));
    await db.putMeta('reminderDigest', { tasks: tasks.concat(photoDue), generatedAt: now.toISOString() });
  } catch { /* ignore */ }
}

function updateNav(hash) {
  document.querySelectorAll('.nav-item').forEach((n) => {
    const target = n.dataset.target;
    const active =
      (target === '/today' && (hash === '/' || hash.startsWith('/today'))) ||
      (target === '/plants' && (hash.startsWith('/plants') || hash.startsWith('/plant/') || hash.startsWith('/add') || hash.startsWith('/edit'))) ||
      (target === '/guide' && (hash.startsWith('/guide') || hash.startsWith('/diagnose'))) ||
      (target === '/settings' && hash.startsWith('/settings'));
    n.classList.toggle('active', active);
  });
}

// ---- Header helper ------------------------------------------------------

function viewHeader(title, { back = null, actions = [] } = {}) {
  const left = back
    ? el('button', { class: 'icon-btn', title: 'Back', onClick: () => (back === true ? history.back() : navigate(back)) }, '‹')
    : el('span', { class: 'logo' }, '🌿');
  return el('header', { class: 'view-header' }, [
    left,
    el('h1', {}, title),
    el('div', { class: 'header-actions' }, actions),
  ]);
}

// =========================================================================
// TODAY / DASHBOARD
// =========================================================================

route(/^\/(today)?$/, async () => {
  const settings = getSettings();
  const now = new Date();
  const [plants, events] = await Promise.all([db.getPlants(), db.getEvents()]);
  const season = seasonForDate(now, settings.hemisphere);
  const meta = SEASON_META[season];

  const view = el('div', { class: 'view' });
  view.append(viewHeader('Today', {
    actions: [el('button', { class: 'icon-btn', title: 'Add plant', onClick: () => navigate('/add') }, '＋')],
  }));

  // Offer to install as a real app (only shows when the browser says it can).
  if (deferredInstallPrompt && !isStandalone() && !sessionStorage.getItem('hideInstall')) {
    view.append(el('div', { class: 'install-banner' }, [
      el('span', { class: 'install-emoji' }, '📲'),
      el('div', { class: 'install-text' }, [
        el('div', { class: 'install-title' }, 'Install Plant Tracker'),
        el('div', { class: 'install-sub' }, 'Add it to your home screen as a full app'),
      ]),
      el('button', { class: 'install-btn', onClick: triggerInstall }, 'Install'),
      el('button', { class: 'install-x', title: 'Dismiss', onClick: () => { sessionStorage.setItem('hideInstall', '1'); render(); } }, '×'),
    ]));
  }

  // Season banner
  view.append(el('div', { class: 'season-banner' }, [
    el('div', { class: 'season-emoji' }, meta.emoji),
    el('div', {}, [
      el('div', { class: 'season-title' }, `${meta.label} · ${settings.hemisphere === 'N' ? 'Northern' : 'Southern'} hemisphere`),
      el('div', { class: 'season-note' }, meta.note),
    ]),
  ]));

  if (plants.length === 0) {
    view.append(emptyState(
      '🪴', 'No plants yet',
      'Add your first plant to start tracking watering, feeding and health.',
      'Add a plant', () => navigate('/add'),
    ));
    app.append(view);
    return;
  }

  const overdue = dueTasks(plants, events, now, settings.hemisphere, 0);
  const upcoming = dueTasks(plants, events, now, settings.hemisphere, 3).filter((t) => t.daysUntil > 0);

  // Summary counts
  const stats = plants.map((p) => overallStatus(p, events, now, settings.hemisphere));
  const counts = { good: 0, watch: 0, poor: 0 };
  stats.forEach((s) => counts[s.level]++);
  view.append(el('div', { class: 'stat-row' }, [
    statCard(counts.good, 'Healthy', 'good'),
    statCard(counts.watch, 'Needs care', 'watch'),
    statCard(counts.poor, 'At risk', 'poor'),
  ]));

  // Due now
  view.append(el('h2', { class: 'section-title' }, overdue.length ? `Needs care now (${overdue.length})` : 'Needs care now'));
  if (overdue.length === 0) {
    view.append(el('div', { class: 'all-done' }, ['✅ ', 'All caught up — nothing due today.']));
  } else {
    const list = el('div', { class: 'task-list' });
    overdue.forEach((t) => list.append(taskRow(t, now, () => render())));
    view.append(list);
  }

  // Upcoming
  if (upcoming.length) {
    view.append(el('h2', { class: 'section-title' }, 'Coming up'));
    const list = el('div', { class: 'task-list' });
    upcoming.forEach((t) => list.append(taskRow(t, now, () => render(), true)));
    view.append(list);
  }

  // Progress photos due — with a one-tap camera shortcut on each.
  const photoDue = plants.filter((p) => photoStatus(p, events, now).due);
  if (photoDue.length) {
    view.append(el('h2', { class: 'section-title' }, `Progress photos (${photoDue.length})`));
    const list = el('div', { class: 'task-list' });
    photoDue.forEach((p) => {
      list.append(el('div', { class: 'task-row', onClick: () => navigate(`/plant/${p.id}`) }, [
        plantThumb(p, 44),
        el('div', { class: 'task-main' }, [
          el('div', { class: 'task-name' }, p.name),
          el('div', { class: 'task-sub' }, '📸 Time for a fresh health photo'),
        ]),
        quickPhotoButton(p, { className: 'do-btn photo-do', label: '📷 Photo', stopProp: true }),
      ]));
    });
    view.append(list);
  }

  app.append(view);
});

function statCard(n, label, level) {
  return el('div', { class: `stat-card stat-${level}` }, [
    el('div', { class: 'stat-num' }, String(n)),
    el('div', { class: 'stat-label' }, label),
  ]);
}

function taskRow(task, now, onDone, upcoming = false) {
  const isWater = task.type === 'water';
  const icon = isWater ? '💧' : '🌱';
  const verb = isWater ? 'Water' : 'Feed';
  const cls = STATE_CLASS[task.state] || 'muted';
  const when = task.daysUntil < 0
    ? `${-task.daysUntil}d overdue`
    : task.daysUntil === 0 ? 'due today' : fmtRelative(task.daysUntil);

  const row = el('div', { class: `task-row task-${cls}`, onClick: () => navigate(`/plant/${task.plant.id}`) }, [
    plantThumb(task.plant, 44),
    el('div', { class: 'task-main' }, [
      el('div', { class: 'task-name' }, task.plant.name),
      el('div', { class: 'task-sub' }, [`${icon} ${verb} · `, el('span', { class: `when when-${cls}` }, when)]),
    ]),
  ]);
  if (!upcoming) {
    row.append(el('button', {
      class: 'do-btn',
      onClick: async (e) => {
        e.stopPropagation();
        await logCare(task.plant.id, task.type);
        toast(`${task.plant.name}: logged ${isWater ? 'watering' : 'feeding'}`);
        onDone();
      },
    }, isWater ? 'Water' : 'Feed'));
  }
  return row;
}

async function logCare(plantId, type, dateISO = todayISO(), extra = {}) {
  await db.putEvent({
    id: db.uid('ev'),
    plantId,
    type,
    date: dateInputToISO(dateISO),
    ...extra,
  });
}

// =========================================================================
// MY PLANTS
// =========================================================================

route(/^\/plants$/, async () => {
  const settings = getSettings();
  const now = new Date();
  const [plants, events] = await Promise.all([db.getPlants(), db.getEvents()]);

  const view = el('div', { class: 'view' });
  view.append(viewHeader('My Plants', {
    actions: [el('button', { class: 'icon-btn', title: 'Add plant', onClick: () => navigate('/add') }, '＋')],
  }));

  if (plants.length === 0) {
    view.append(emptyState('🪴', 'No plants yet', 'Add your first plant to get started.', 'Add a plant', () => navigate('/add')));
    app.append(view);
    return;
  }

  const grid = el('div', { class: 'plant-grid' });
  for (const p of plants) {
    const st = overallStatus(p, events, now, settings.hemisphere);
    const w = st.water;
    const waterWhen = w.daysUntil < 0 ? `Water ${-w.daysUntil}d overdue`
      : w.daysUntil === 0 ? 'Water today' : `Water ${fmtRelative(w.daysUntil)}`;
    grid.append(el('div', { class: 'plant-card', onClick: () => navigate(`/plant/${p.id}`) }, [
      el('div', { class: 'plant-card-photo' }, [plantThumb(p, 0)]),
      el('div', { class: 'plant-card-body' }, [
        el('div', { class: 'plant-card-top' }, [
          el('div', { class: 'plant-card-name' }, p.name),
          el('span', { class: `dot dot-${st.level}`, title: st.label }),
        ]),
        el('div', { class: 'plant-card-species' }, speciesLabel(p)),
        el('div', { class: `plant-card-water when-${STATE_CLASS[w.state]}` }, `💧 ${waterWhen}`),
      ]),
    ]));
  }
  view.append(grid);
  app.append(view);
});

function speciesLabel(p) {
  const s = p.speciesId ? getSpecies(p.speciesId) : null;
  return s ? s.name : (p.latin || 'Custom plant');
}

// Photo thumbnail or emoji fallback. size 0 => fill container.
function plantThumb(plant, size = 48) {
  if (plant.photo) {
    const img = el('img', { class: 'thumb', src: plant.photo, alt: plant.name });
    if (size) { img.style.width = size + 'px'; img.style.height = size + 'px'; }
    return img;
  }
  const s = plant.speciesId ? getSpecies(plant.speciesId) : null;
  const emoji = categoryEmoji(s ? s.category : null);
  const ph = el('div', { class: 'thumb thumb-ph' }, emoji);
  if (size) { ph.style.width = size + 'px'; ph.style.height = size + 'px'; ph.style.fontSize = Math.round(size * 0.5) + 'px'; }
  return ph;
}

function categoryEmoji(cat) {
  return ({
    succulent: '🌵', 'tropical-foliage': '🌿', fern: '🌿', orchid: '🌸',
    flowering: '🌼', herb: '🌱',
  })[cat] || '🪴';
}

const CAT_LABEL = {
  'tropical-foliage': 'Tropical foliage', succulent: 'Succulents & cacti',
  fern: 'Ferns', orchid: 'Orchids', flowering: 'Flowering', herb: 'Herbs', other: 'Other',
};

// Human-readable summary of a plant's pot/spot conditions (empty if none set).
function conditionsSummary(c) {
  if (!c) return '';
  const map = {
    potSize: { small: 'small pot', medium: 'medium pot', large: 'large pot' },
    potMaterial: { terracotta: 'terracotta', plastic: 'plastic', ceramic: 'glazed ceramic', metal: 'metal' },
    drainage: { yes: 'good drainage', no: 'no drainage' },
    lightSpot: { low: 'low light', medium: 'medium light', bright: 'bright light' },
  };
  const parts = [];
  for (const k of ['potSize', 'potMaterial', 'drainage', 'lightSpot']) {
    if (c[k] && map[k][c[k]]) parts.push(map[k][c[k]]);
  }
  return parts.join(' · ');
}

async function reloadCustomSpecies() {
  try { registerCustomSpecies(await db.getCustomSpecies()); } catch { /* ignore */ }
}

// (Re)build the species <select>: built-in groups + a "My saved species" group.
function buildSpeciesOptions(sel, selectedId) {
  clear(sel);
  sel.append(el('option', { value: '' }, '— Choose a species (autofills care) —'));
  const cats = {};
  SPECIES.forEach((s) => { (cats[s.category] ||= []).push(s); });
  for (const cat of Object.keys(cats)) {
    const g = el('optgroup', { label: CAT_LABEL[cat] || cat });
    cats[cat].forEach((s) => g.append(el('option', { value: s.id }, s.name)));
    sel.append(g);
  }
  const custom = allSpecies().filter((s) => isCustomSpecies(s.id));
  if (custom.length) {
    const g = el('optgroup', { label: 'My saved species' });
    custom.forEach((s) => g.append(el('option', { value: s.id }, s.name)));
    sel.append(g);
  }
  sel.append(el('option', { value: '__custom' }, 'Custom / not listed'));
  if (selectedId != null) sel.value = selectedId;
}

// Persist an AI-looked-up species to the reusable library (dedupe by name/latin).
async function saveLookedUpSpecies(c) {
  const latin = (c.latin_name || '').trim().toLowerCase();
  const common = (c.common_name || '').trim().toLowerCase();
  const existing = allSpecies().find((s) => isCustomSpecies(s.id) &&
    ((latin && (s.latin || '').toLowerCase() === latin) ||
     (common && (s.name || '').toLowerCase() === common)));
  if (existing) return existing.id;

  const slug = (c.common_name || c.latin_name || 'plant').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'plant';
  const id = `cust_${slug}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  const species = {
    id,
    name: c.common_name || c.latin_name || 'Custom plant',
    latin: c.latin_name || '',
    aka: [],
    category: c.category || 'other',
    water: Math.max(1, c.water_interval_days || 7),
    winterFactor: c.winter_factor || 1.5,
    fertilize: Math.max(0, Number.isInteger(c.fertilize_interval_days) ? c.fertilize_interval_days : 30),
    feedWinter: !!c.feed_winter,
    light: c.light || 'medium',
    humidity: c.humidity || 'Average',
    tempMin: Number.isFinite(c.temp_min_c) ? c.temp_min_c : 13,
    toxic: c.toxicity || 'Unknown',
    difficulty: c.difficulty || 'moderate',
    soil: c.soil || 'Well-draining potting mix',
    tips: c.tips || '',
    custom: true,
  };
  await db.putCustomSpecies(species);
  await reloadCustomSpecies();
  return id;
}

// =========================================================================
// PLANT DETAIL
// =========================================================================

route(/^\/plant\/(.+)$/, async (id) => {
  const settings = getSettings();
  const now = new Date();
  const plant = await db.getPlant(id);
  if (!plant) { navigate('/plants'); return; }
  const events = await db.getEvents(id);
  const st = overallStatus(plant, events, now, settings.hemisphere);
  const season = seasonForDate(now, settings.hemisphere);

  const view = el('div', { class: 'view' });
  view.append(viewHeader(plant.name, {
    back: '/plants',
    actions: [el('button', { class: 'icon-btn', title: 'Edit', onClick: () => navigate(`/edit/${id}`) }, '✏️')],
  }));

  // Hero
  view.append(el('div', { class: 'detail-hero' }, [
    el('div', { class: 'detail-hero-photo' }, [plantThumb(plant, 0)]),
    el('div', { class: 'detail-hero-info' }, [
      statusPill(st.level, st.label),
      el('div', { class: 'detail-species' }, speciesLabel(plant)),
      plant.latin ? el('div', { class: 'detail-latin' }, plant.latin) : null,
      plant.location ? el('div', { class: 'detail-meta' }, `📍 ${plant.location}`) : null,
    ]),
  ]));

  // Seasonal note for this plant
  view.append(el('div', { class: 'season-inline' }, [
    `${SEASON_META[season].emoji} ${SEASON_META[season].label}: `,
    seasonalExplanation(season, plant.profile),
  ]));
  const condSummary = conditionsSummary(plant.conditions);
  if (condSummary) view.append(el('div', { class: 'season-inline' }, [`🪴 Personalized for its pot & spot: ${condSummary}`]));

  // AI health check — the standout "let me look at your plant" action.
  view.append(el('button', { class: 'ai-cta', onClick: () => openAIDialog(plant) }, [
    el('span', { class: 'ai-cta-icon' }, '✨'),
    el('div', { class: 'ai-cta-body' }, [
      el('div', { class: 'ai-cta-title' }, 'AI health check'),
      el('div', { class: 'ai-cta-sub' }, 'Show a photo and get an expert read on how it’s doing'),
    ]),
    el('span', { class: 'ai-cta-arrow' }, '›'),
  ]));
  // Free alternative: hand the conversation to your own Claude/ChatGPT.
  view.append(el('button', { class: 'handoff-link', onClick: () => openHandoffDialog(plant) },
    '💬 Or continue in your own Claude / ChatGPT (free)'));

  // Schedule cards
  const w = st.water;
  const f = st.feed;
  const sched = el('div', { class: 'schedule-cards' });
  sched.append(scheduleCard({
    icon: '💧', title: 'Water',
    every: `every ${w.interval} days`,
    last: w.everDone ? fmtDate(w.lastDate) : 'not yet logged',
    due: w.due, daysUntil: w.daysUntil, state: w.state,
    onDo: async () => { await logCare(id, 'water'); toast('Watering logged'); render(); },
    onDoDated: () => openLogDialog(plant, 'water'),
    doLabel: 'Log watering',
  }));
  if (f) {
    sched.append(scheduleCard({
      icon: '🌱', title: 'Feed',
      every: `every ${f.interval} days`,
      last: f.everDone ? fmtDate(f.lastDate) : 'not yet logged',
      due: f.due, daysUntil: f.daysUntil, state: f.state, paused: f.state === 'paused',
      onDo: async () => { await logCare(id, 'fertilize'); toast('Feeding logged'); render(); },
      onDoDated: () => openLogDialog(plant, 'fertilize'),
      doLabel: 'Log feeding',
    }));
  }
  view.append(sched);

  // Quick log actions
  view.append(el('div', { class: 'quick-actions' }, [
    quickBtn('💧', 'Water', () => quickLog(id, 'water')),
    quickBtn('🌱', 'Feed', () => quickLog(id, 'fertilize')),
    quickBtn('❤️', 'Health', () => openHealthDialog(plant)),
    quickBtn('📷', 'Photo', () => openPhotoDialog(plant)),
    quickBtn('✂️', 'More', () => openMoreDialog(plant)),
  ]));

  // Care coach — warm, plain-language "how to keep it thriving" guidance.
  view.append(el('h2', { class: 'section-title' }, 'Care coach'));
  const coachTips = careTips(plant, settings, now);
  view.append(el('div', { class: 'coach-card' }, [
    el('div', { class: 'coach-avatar' }, '🌿'),
    el('div', { class: 'coach-body' }, [
      el('div', { class: 'coach-msg' }, welcomeMessage(plant, settings, now)),
      el('ul', { class: 'coach-tips' }, coachTips.map((t) =>
        el('li', {}, [el('span', { class: 'coach-tip-icon' }, t.icon), el('span', {}, t.text)]),
      )),
    ]),
  ]));

  // Care requirements
  const pr = plant.profile;
  view.append(el('h2', { class: 'section-title' }, 'Care needs'));
  view.append(el('div', { class: 'care-grid' }, [
    careItem('☀️', 'Light', LIGHT[pr.light] || pr.light),
    careItem('💧', 'Water', `Every ${pr.water} days (growing season)`),
    careItem('💦', 'Humidity', pr.humidity),
    careItem('🌡️', 'Min temp', `${pr.tempMin}°C`),
    careItem('🌱', 'Feed', pr.fertilize ? `Every ${pr.fertilize} days in season` : 'Rarely'),
    careItem('🪴', 'Soil', pr.soil),
    careItem('🐾', 'Toxicity', pr.toxic),
    careItem('📈', 'Difficulty', cap(pr.difficulty)),
  ]));
  if (pr.tips) {
    view.append(el('div', { class: 'tips-box' }, ['💡 ', pr.tips]));
  }

  // Photo progression + "time for a fresh photo" reminder
  const photos = events.filter((e) => e.photo).sort((a, b) => new Date(a.date) - new Date(b.date));
  const ps = photoStatus(plant, events, now);
  view.append(el('h2', { class: 'section-title' }, `Photo progression${photos.length ? ` (${photos.length})` : ''}`));
  if (ps.due) {
    view.append(el('div', { class: 'photo-nudge' }, [
      el('span', { class: 'photo-nudge-icon' }, '📸'),
      el('div', { class: 'photo-nudge-text' }, [
        el('div', { class: 'photo-nudge-title' }, ps.last ? 'Time for a fresh health photo' : 'Add a starting photo'),
        el('div', { class: 'photo-nudge-sub' }, ps.last
          ? `It's been ${ps.daysSince} days since the last one — snap a new photo to track how it's doing.`
          : 'Snap one now to start tracking its progress over time.'),
      ]),
      quickPhotoButton(plant, { className: 'photo-nudge-btn', label: '📷 Take photo' }),
    ]));
  }
  if (photos.length) {
    const strip = el('div', { class: 'photo-strip' });
    photos.forEach((e) => {
      strip.append(el('figure', { class: 'photo-item', onClick: () => openImage(e.photo, fmtDate(e.date)) }, [
        el('img', { src: e.photo, alt: fmtDate(e.date) }),
        el('figcaption', {}, fmtDate(e.date)),
      ]));
    });
    view.append(strip);
  }
  view.append(quickPhotoButton(plant, { className: 'btn btn-secondary full' }));

  // Growth — height over time
  const heightPts = events
    .filter((e) => e.type === 'growth' && Number.isFinite(e.height))
    .map((e) => ({ date: new Date(e.date), value: e.height }))
    .sort((a, b) => a.date - b.date);
  view.append(el('h2', { class: 'section-title' }, 'Growth'));
  if (heightPts.length >= 2) {
    const first = heightPts[0], last = heightPts[heightPts.length - 1];
    const change = Math.round((last.value - first.value) * 10) / 10;
    const minY = Math.min(...heightPts.map((p) => p.value));
    const maxY = Math.max(...heightPts.map((p) => p.value));
    view.append(el('div', { class: 'growth-head' }, [
      el('span', { class: 'growth-latest' }, `${last.value} cm`),
      el('span', { class: `growth-change ${change >= 0 ? 'up' : 'down'}` },
        `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)} cm since ${fmtDate(first.date)}`),
    ]));
    view.append(growthChart(heightPts));
    view.append(el('div', { class: 'growth-caption' }, `${minY}–${maxY} cm · ${fmtDate(first.date)} → ${fmtDate(last.date)}`));
  } else if (heightPts.length === 1) {
    view.append(el('div', { class: 'muted-box' }, `Latest height: ${heightPts[0].value} cm. Add another measurement to see the trend.`));
  } else {
    view.append(el('div', { class: 'muted-box' }, 'Log its height over time to watch it grow.'));
  }
  view.append(el('button', { class: 'btn btn-secondary full', onClick: () => openGrowthDialog(plant) }, '📏 Add measurement'));

  // History timeline
  view.append(el('h2', { class: 'section-title' }, 'Care history'));
  if (events.length === 0) {
    view.append(el('div', { class: 'muted-box' }, 'No history yet. Log a watering or note to start the timeline.'));
  } else {
    const tl = el('div', { class: 'timeline' });
    events.forEach((e) => tl.append(timelineRow(e, plant, () => render())));
    view.append(tl);
  }

  // Danger zone
  view.append(el('div', { class: 'danger-zone' }, [
    el('button', { class: 'text-danger', onClick: () => confirmDelete(plant) }, '🗑️ Delete this plant'),
  ]));

  app.append(view);
});

function scheduleCard({ icon, title, every, last, due, daysUntil, state, paused, onDo, onDoDated, doLabel }) {
  const cls = STATE_CLASS[state] || 'muted';
  const whenText = paused ? 'Paused this season'
    : daysUntil < 0 ? `${-daysUntil} days overdue`
    : daysUntil === 0 ? 'Due today' : `Due ${fmtRelative(daysUntil)}`;
  return el('div', { class: `sched-card sched-${cls}` }, [
    el('div', { class: 'sched-head' }, [
      el('span', { class: 'sched-icon' }, icon),
      el('span', { class: 'sched-title' }, title),
      el('span', { class: `sched-when when-${cls}` }, whenText),
    ]),
    el('div', { class: 'sched-sub' }, `${every} · last: ${last}`),
    el('div', { class: 'sched-actions' }, [
      el('button', { class: 'sched-do', onClick: onDo }, doLabel),
      onDoDated ? el('button', { class: 'sched-date-btn', title: 'Log on a specific date', onClick: onDoDated }, '📅') : null,
    ].filter(Boolean)),
  ]);
}

// Log a watering/feeding on a chosen date (default today) — for when you forgot
// to log on the day. Keeping the real date keeps the schedule accurate.
function openLogDialog(plant, type) {
  const isWater = type === 'water';
  const dateInput = el('input', { type: 'date', value: todayISO(), max: todayISO(), class: 'field' });
  const m = modal([
    el('h3', { class: 'modal-title' }, isWater ? 'Log watering' : 'Log feeding'),
    labeled(`When did you ${isWater ? 'water' : 'feed'} it?`, dateInput),
    el('div', { class: 'hint' }, 'Pick the day it actually happened so your schedule stays accurate.'),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn btn-ghost', onClick: () => m.close() }, 'Cancel'),
      el('button', { class: 'btn btn-primary', onClick: async () => {
        await logCare(plant.id, type, dateInput.value);
        m.close(); toast(isWater ? 'Watering logged' : 'Feeding logged'); render();
      } }, 'Log'),
    ]),
  ]);
}

// Edit the date of an existing log entry.
function openEditDateDialog(event) {
  const meta = EVENT_META[event.type] || { label: event.type };
  const dateInput = el('input', { type: 'date', value: toDateInputValue(event.date), max: todayISO(), class: 'field' });
  const m = modal([
    el('h3', { class: 'modal-title' }, `Edit date — ${meta.label}`),
    labeled('Date', dateInput),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn btn-ghost', onClick: () => m.close() }, 'Cancel'),
      el('button', { class: 'btn btn-primary', onClick: async () => {
        event.date = dateInputToISO(dateInput.value);
        await db.putEvent(event);
        m.close(); toast('Date updated'); render();
      } }, 'Save'),
    ]),
  ]);
}

function careItem(icon, label, value) {
  return el('div', { class: 'care-item' }, [
    el('div', { class: 'care-icon' }, icon),
    el('div', {}, [
      el('div', { class: 'care-label' }, label),
      el('div', { class: 'care-value' }, value),
    ]),
  ]);
}

function quickBtn(icon, label, onClick) {
  return el('button', { class: 'quick-btn', onClick }, [
    el('span', { class: 'quick-icon' }, icon),
    el('span', { class: 'quick-label' }, label),
  ]);
}

async function quickLog(plantId, type) {
  await logCare(plantId, type);
  toast(type === 'water' ? 'Watering logged' : 'Feeding logged');
  render();
}

const EVENT_META = {
  water: { icon: '💧', label: 'Watered' },
  fertilize: { icon: '🌱', label: 'Fed' },
  health: { icon: '❤️', label: 'Health check' },
  photo: { icon: '📷', label: 'Photo' },
  repot: { icon: '🪴', label: 'Repotted' },
  prune: { icon: '✂️', label: 'Pruned' },
  mist: { icon: '💦', label: 'Misted' },
  note: { icon: '📝', label: 'Note' },
  growth: { icon: '📏', label: 'Measured' },
};

function timelineRow(e, plant, onChange) {
  const meta = EVENT_META[e.type] || { icon: '•', label: e.type };
  const healthTag = e.health ? el('span', { class: `health-tag health-${e.health}` }, cap(e.health)) : null;
  return el('div', { class: 'tl-row' }, [
    el('div', { class: 'tl-icon' }, meta.icon),
    el('div', { class: 'tl-body' }, [
      el('div', { class: 'tl-top' }, [
        el('span', { class: 'tl-label' }, meta.label),
        healthTag,
        el('button', { class: 'tl-date tl-date-btn', title: 'Edit date', onClick: () => openEditDateDialog(e) }, fmtDate(e.date)),
      ]),
      e.notes ? el('div', { class: 'tl-notes' }, e.notes) : null,
      e.photo ? el('img', { class: 'tl-photo', src: e.photo, alt: 'photo', onClick: () => openImage(e.photo, fmtDate(e.date)) }) : null,
    ]),
    el('button', {
      class: 'tl-del', title: 'Delete entry',
      onClick: async () => { await db.deleteEvent(e.id); toast('Entry removed'); onChange(); },
    }, '×'),
  ]);
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// =========================================================================
// DIALOGS (health, photo, more, image viewer, confirm)
// =========================================================================

function modal(contentNodes, { onClose } = {}) {
  const overlay = el('div', { class: 'modal-overlay', onClick: (e) => { if (e.target === overlay) close(); } });
  const box = el('div', { class: 'modal' }, contentNodes);
  overlay.append(box);
  document.body.append(overlay);
  function close() { overlay.remove(); if (onClose) onClose(); }
  return { close, overlay };
}

function openImage(src, caption) {
  const nodes = [
    el('img', { class: 'modal-full-img', src, alt: caption || '' }),
    caption ? el('div', { class: 'modal-caption' }, caption) : null,
  ].filter(Boolean);
  const m = modal(nodes);
  m.overlay.querySelector('.modal').append(
    el('button', { class: 'btn btn-ghost full', onClick: () => m.close() }, 'Close'),
  );
}

function openHealthDialog(plant) {
  let health = 'good';
  const photoState = { dataUrl: null };
  const dateInput = el('input', { type: 'date', value: todayISO(), class: 'field' });
  const notes = el('textarea', { class: 'field', rows: 3, placeholder: 'How is it doing? New growth, spots, drooping…' });

  const chips = el('div', { class: 'seg' }, [
    segChip('good', 'Thriving', () => (health = 'good')),
    segChip('ok', 'So-so', () => (health = 'ok')),
    segChip('poor', 'Struggling', () => (health = 'poor')),
  ]);
  // default select first
  chips.firstChild.classList.add('sel');
  chips.querySelectorAll('.seg-chip').forEach((c) => c.addEventListener('click', () => {
    chips.querySelectorAll('.seg-chip').forEach((x) => x.classList.remove('sel'));
    c.classList.add('sel');
  }));

  const photoBtn = photoPicker(photoState);

  const m = modal([
    el('h3', { class: 'modal-title' }, 'Log health check'),
    labeled('Condition', chips),
    labeled('Date', dateInput),
    labeled('Notes', notes),
    labeled('Photo (optional)', photoBtn.node),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn btn-ghost', onClick: () => m.close() }, 'Cancel'),
      el('button', { class: 'btn btn-primary', onClick: async () => {
        await logCare(plant.id, 'health', dateInput.value, {
          health, notes: notes.value.trim(), photo: photoState.dataUrl || undefined,
        });
        m.close(); toast('Health check logged'); render();
      } }, 'Save'),
    ]),
  ]);
}

function openPhotoDialog(plant) {
  const photoState = { dataUrl: null };
  const dateInput = el('input', { type: 'date', value: todayISO(), class: 'field' });
  const notes = el('input', { class: 'field', placeholder: 'Caption (optional)' });
  const photoBtn = photoPicker(photoState, true);
  const setMain = el('input', { type: 'checkbox' });

  const m = modal([
    el('h3', { class: 'modal-title' }, 'Add photo'),
    photoBtn.node,
    labeled('Date', dateInput),
    labeled('Caption', notes),
    el('label', { class: 'checkline' }, [setMain, ' Use as this plant’s main photo']),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn btn-ghost', onClick: () => m.close() }, 'Cancel'),
      el('button', { class: 'btn btn-primary', onClick: async () => {
        if (!photoState.dataUrl) { toast('Pick a photo first'); return; }
        await logCare(plant.id, 'photo', dateInput.value, { notes: notes.value.trim(), photo: photoState.dataUrl });
        if (setMain.checked) { plant.photo = photoState.dataUrl; await db.putPlant(plant); }
        m.close(); toast('Photo added'); render();
      } }, 'Save'),
    ]),
  ]);
}

function openMoreDialog(plant) {
  const dateInput = el('input', { type: 'date', value: todayISO(), class: 'field' });
  const notes = el('input', { class: 'field', placeholder: 'Optional note' });
  let type = 'repot';
  const sel = el('select', { class: 'field', onChange: (e) => (type = e.target.value) }, [
    el('option', { value: 'repot' }, 'Repotted'),
    el('option', { value: 'prune' }, 'Pruned'),
    el('option', { value: 'mist' }, 'Misted'),
    el('option', { value: 'note' }, 'General note'),
  ]);
  const m = modal([
    el('h3', { class: 'modal-title' }, 'Log activity'),
    labeled('Activity', sel),
    labeled('Date', dateInput),
    labeled('Note', notes),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn btn-ghost', onClick: () => m.close() }, 'Cancel'),
      el('button', { class: 'btn btn-primary', onClick: async () => {
        await logCare(plant.id, type, dateInput.value, { notes: notes.value.trim() });
        m.close(); toast('Logged'); render();
      } }, 'Save'),
    ]),
  ]);
}

const CONDITION_LEVEL = { good: 'good', ok: 'watch', poor: 'poor' };

async function openAIDialog(plant) {
  const settings = getSettings();

  // No key yet → friendly gate rather than a broken feature.
  if (!hasApiKey()) {
    const m = modal([
      el('h3', { class: 'modal-title' }, '✨ AI health check'),
      el('p', { class: 'modal-text' }, 'Show Claude a photo of your plant and get a warm, expert read on its health plus what to do next.'),
      el('p', { class: 'modal-text' }, 'This is the one feature that needs the internet — it uses your own Anthropic API key, which you add once in Settings and which stays on this device.'),
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn btn-ghost', onClick: () => m.close() }, 'Not now'),
        el('button', { class: 'btn btn-primary', onClick: () => { m.close(); navigate('/settings'); } }, 'Add API key'),
      ]),
    ]);
    return;
  }

  // Default to the most recent photo we have for this plant.
  let defaultPhoto = plant.photo || null;
  try {
    const events = await db.getEvents(plant.id);
    const lastPhoto = events.find((e) => e.photo);
    if (lastPhoto) defaultPhoto = lastPhoto.photo;
  } catch { /* ignore */ }

  const photoState = { dataUrl: defaultPhoto };
  const result = el('div', { class: 'ai-result' });
  const pf = photoField({
    initial: defaultPhoto,
    big: true,
    placeholder: '📷 Take or choose a photo of your plant',
    onPicked: (d) => { photoState.dataUrl = d; result.replaceChildren(); },
  });
  const bgInput = el('textarea', {
    class: 'field', rows: 2,
    placeholder: 'e.g. just repotted it, moved it to a darker room, leaves started browning last week, I water it weekly…',
  });
  const analyzeBtn = el('button', { class: 'btn btn-primary full' }, '✨ Analyze this plant');

  analyzeBtn.addEventListener('click', async () => {
    if (!photoState.dataUrl) { toast('Pick a photo first'); return; }
    analyzeBtn.disabled = true;
    clear(result);
    result.append(el('div', { class: 'ai-loading' }, [
      el('span', { class: 'spinner' }),
      el('span', {}, 'Looking at your plant…'),
    ]));
    try {
      const season = seasonForDate(new Date(), settings.hemisphere);
      const analysis = await analyzePlant(photoState.dataUrl, {
        plantName: plant.name,
        speciesName: speciesLabel(plant),
        season,
        waterBase: plant.profile.water,
        feedBase: plant.profile.fertilize,
        background: bgInput.value.trim(),
      });
      renderAIResult(result, analysis, plant, photoState.dataUrl, () => m.close());
      analyzeBtn.textContent = '✨ Analyze again';
    } catch (e) {
      clear(result);
      const msg = e instanceof AIError ? e.message : 'Something went wrong. Please try again.';
      result.append(el('div', { class: 'ai-error' }, ['⚠️ ', msg]));
      if (e instanceof AIError && (e.code === 'no-key' || e.code === 'auth')) {
        result.append(el('button', { class: 'btn btn-secondary full', onClick: () => { m.close(); navigate('/settings'); } }, 'Open Settings'));
      }
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  const m = modal([
    el('h3', { class: 'modal-title' }, '✨ AI health check'),
    pf.node,
    labeled('Anything I should know? (optional)', bgInput),
    el('div', { class: 'hint bg-hint' }, 'The more context you give — recent changes, symptoms, how you water it — the better the read. You can add more and tap “Analyze again”.'),
    analyzeBtn,
    result,
    el('button', { class: 'btn btn-ghost full', onClick: () => m.close() }, 'Close'),
  ]);
}

function renderAIResult(container, a, plant, photo, closeDialog) {
  clear(container);
  const level = CONDITION_LEVEL[a.condition] || 'watch';

  if (a.is_plant === false) {
    container.append(el('div', { class: 'ai-bubble' }, [
      el('div', { class: 'ai-headline' }, "Hmm, that doesn't look like a plant"),
      el('div', { class: 'ai-assessment' }, a.assessment || 'Try a photo of just the plant and I’ll take another look.'),
    ]));
    return;
  }

  const bubble = el('div', { class: 'ai-bubble' }, [
    el('div', { class: 'ai-bubble-top' }, [
      statusPill(level, cap(a.condition)),
      a.species_guess ? el('span', { class: 'ai-species' }, `looks like ${a.species_guess}`) : null,
    ]),
    el('div', { class: 'ai-headline' }, a.headline || ''),
    el('div', { class: 'ai-assessment' }, a.assessment || ''),
  ]);

  if (a.observations && a.observations.length) {
    bubble.append(el('div', { class: 'ai-sub' }, 'What I notice'));
    bubble.append(el('ul', { class: 'ai-list' }, a.observations.map((o) => el('li', {}, o))));
  }
  if (a.next_steps && a.next_steps.length) {
    bubble.append(el('div', { class: 'ai-sub' }, 'What to do'));
    bubble.append(el('ol', { class: 'ai-list ai-steps' }, a.next_steps.map((s) => el('li', {}, s))));
  }
  if (a.watch_for && a.watch_for.length) {
    bubble.append(el('div', { class: 'ai-sub' }, 'Keep an eye out for'));
    bubble.append(el('ul', { class: 'ai-list' }, a.watch_for.map((w) => el('li', {}, w))));
  }
  container.append(bubble);

  // One-tap apply: turn the AI's recommendation into concrete schedule changes.
  const adj = a.adjustments || {};
  const changes = [];
  if (adj.recommend_watering_change && Number.isInteger(adj.water_interval_days) &&
      adj.water_interval_days > 0 && adj.water_interval_days !== plant.profile.water) {
    changes.push({ kind: 'water', from: plant.profile.water, to: adj.water_interval_days });
  }
  if (adj.recommend_feeding_change && Number.isInteger(adj.fertilize_interval_days) &&
      adj.fertilize_interval_days >= 0 && adj.fertilize_interval_days !== plant.profile.fertilize) {
    changes.push({ kind: 'feed', from: plant.profile.fertilize, to: adj.fertilize_interval_days });
  }
  if (adj.water_now) changes.push({ kind: 'water_now' });

  if (changes.length) {
    const label = (c) =>
      c.kind === 'water' ? `💧 Water every ${c.to} day${c.to === 1 ? '' : 's'} (was ${c.from})`
      : c.kind === 'feed' ? (c.to ? `🌱 Feed every ${c.to} days (was ${c.from || 'never'})` : '🌱 Stop scheduled feeding')
      : '💧 Log a watering today';
    const applyCard = el('div', { class: 'apply-card' }, [
      el('div', { class: 'apply-head' }, '✨ Suggested changes'),
      adj.summary ? el('div', { class: 'apply-summary' }, adj.summary) : null,
      el('ul', { class: 'apply-list' }, changes.map((c) => el('li', {}, label(c)))),
    ].filter(Boolean));
    const applyBtn = el('button', { class: 'btn btn-primary full', onClick: async () => {
      applyBtn.disabled = true;
      let profileChanged = false;
      for (const c of changes) {
        if (c.kind === 'water') { plant.profile.water = c.to; profileChanged = true; }
        else if (c.kind === 'feed') { plant.profile.fertilize = c.to; profileChanged = true; }
      }
      if (profileChanged) await db.putPlant(plant);
      if (changes.some((c) => c.kind === 'water_now')) await logCare(plant.id, 'water');
      toast('Applied — schedule updated');
      closeDialog();
      render();
    } }, 'Apply changes');
    applyCard.append(applyBtn);
    container.append(applyCard);
  }

  // Save the read into the plant's health history.
  container.append(el('button', { class: 'btn btn-secondary full', onClick: async () => {
    const notes = [a.headline, a.assessment].filter(Boolean).join(' — ');
    await logCare(plant.id, 'health', todayISO(), { health: a.condition, notes, photo });
    if (a.species_guess && !plant.latin) { plant.latin = a.species_guess; await db.putPlant(plant); }
    toast('Saved to health log');
    closeDialog();
    render();
  } }, '💾 Save this to the health log'));

  // Continue the conversation for free in your own Claude/ChatGPT.
  container.append(el('button', { class: 'btn btn-ghost full', onClick: () => { closeDialog(); openHandoffDialog(plant, a); } }, '💬 Continue this in your own AI'));
}

// Hand off everything about a plant to the user's own Claude/ChatGPT, and import
// findings back — a zero-API-cost way to keep the conversation going.
async function openHandoffDialog(plant, analysis = null) {
  const settings = getSettings();
  const events = await db.getEvents(plant.id);
  const text = buildHandoff({ plant, events, settings, analysis });

  const photoDataUrl = plant.photo || (events.find((e) => e.photo) || {}).photo || null;

  const exportArea = el('textarea', { class: 'field handoff-text', rows: 7, readonly: 'readonly', spellcheck: 'false' });
  exportArea.value = text;
  const copyBtn = el('button', { class: 'btn btn-primary full', onClick: async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied — paste it into Claude or ChatGPT');
    } catch {
      exportArea.focus(); exportArea.select();
      toast('Select all, then copy (Ctrl/Cmd+C)');
    }
  } }, '📋 Copy hand-off');

  // Optional: copy the plant photo too, so the AI can see it.
  let photoRow = null;
  if (photoDataUrl) {
    photoRow = el('div', { class: 'handoff-photo' }, [
      el('img', { src: photoDataUrl, alt: 'plant photo' }),
      el('div', { class: 'handoff-photo-side' }, [
        el('button', { class: 'btn btn-secondary full', onClick: async () => {
          try {
            const blob = await dataUrlToPngBlob(photoDataUrl);
            if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              toast('Photo copied — paste it into your AI');
              return;
            }
            if (navigator.canShare) {
              const file = new File([blob], 'plant.png', { type: 'image/png' });
              if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
            }
            throw new Error('unsupported');
          } catch {
            toast('Press and hold the photo to copy it');
          }
        } }, '📷 Copy photo'),
        el('div', { class: 'hint' }, 'Paste the text into your AI, then paste the photo as your next message so it can see the plant.'),
      ]),
    ]);
  }

  const summaryPromptBtn = el('button', { class: 'btn btn-secondary full', onClick: async () => {
    try { await navigator.clipboard.writeText(SUMMARY_PROMPT); toast('Copied — send this to your AI to get the summary'); }
    catch { toast('Copy failed — long-press to copy the prompt below'); }
  } }, '📋 Copy summary prompt');

  const importArea = el('textarea', { class: 'field', rows: 5, placeholder: 'Paste your AI’s summary block here…' });
  const importResult = el('div', { class: 'ai-result' });
  const reviewBtn = el('button', { class: 'btn btn-secondary full', onClick: () => {
    clear(importResult);
    const parsed = parseHandoffImport(importArea.value);
    if (!parsed) {
      importResult.append(el('div', { class: 'ai-error' }, '⚠️ Couldn’t find a structured summary in that reply. Use “Copy summary prompt” above, send it to your AI, then paste what it gives back.'));
      return;
    }
    renderImportPreview(importResult, parsed, plant, () => m.close());
  } }, 'Review findings');

  const children = [
    el('h3', { class: 'modal-title' }, '💬 Continue in your own AI'),
    el('div', { class: 'hint' }, 'Paste this hand-off into Claude or ChatGPT to keep troubleshooting for free — it includes everything about this plant. When you’re done, paste the reply back below to import any changes.'),
    el('div', { class: 'handoff-step' }, '1 · Copy & paste into your AI'),
    exportArea,
    copyBtn,
    photoRow,
    el('div', { class: 'handoff-step' }, '2 · Bring the findings back'),
    el('div', { class: 'hint' }, 'When you’re done chatting, ask your AI for an importable summary — copy this prompt, send it, then paste back whatever it replies:'),
    summaryPromptBtn,
    importArea,
    reviewBtn,
    importResult,
    el('button', { class: 'btn btn-ghost full', onClick: () => m.close() }, 'Close'),
  ].filter(Boolean);
  const m = modal(children);
}

function renderImportPreview(container, parsed, plant, closeDialog) {
  clear(container);
  const level = CONDITION_LEVEL[parsed.condition] || 'watch';
  const bubble = el('div', { class: 'ai-bubble' }, [
    parsed.condition ? el('div', { class: 'ai-bubble-top' }, [statusPill(level, cap(parsed.condition))]) : null,
    parsed.summary ? el('div', { class: 'ai-headline' }, parsed.summary) : null,
    parsed.assessment ? el('div', { class: 'ai-assessment' }, parsed.assessment) : null,
  ].filter(Boolean));
  if (parsed.next_steps.length) {
    bubble.append(el('div', { class: 'ai-sub' }, 'Next steps'));
    bubble.append(el('ol', { class: 'ai-list ai-steps' }, parsed.next_steps.map((sp) => el('li', {}, sp))));
  }
  container.append(bubble);

  const cc = parsed.care_changes;
  const changes = [];
  if (Number.isInteger(cc.water_interval_days) && cc.water_interval_days > 0 && cc.water_interval_days !== plant.profile.water) {
    changes.push({ kind: 'water', to: cc.water_interval_days, from: plant.profile.water });
  }
  if (Number.isInteger(cc.fertilize_interval_days) && cc.fertilize_interval_days >= 0 && cc.fertilize_interval_days !== plant.profile.fertilize) {
    changes.push({ kind: 'feed', to: cc.fertilize_interval_days, from: plant.profile.fertilize });
  }
  if (cc.light && cc.light !== plant.profile.light) {
    changes.push({ kind: 'light', to: cc.light, from: plant.profile.light });
  }

  if (changes.length) {
    const label = (c) =>
      c.kind === 'water' ? `💧 Water every ${c.to} day${c.to === 1 ? '' : 's'} (was ${c.from})`
      : c.kind === 'feed' ? (c.to ? `🌱 Feed every ${c.to} days (was ${c.from || 'never'})` : '🌱 Stop scheduled feeding')
      : `☀️ Light: ${LIGHT[c.to] || c.to}`;
    container.append(el('div', { class: 'apply-card' }, [
      el('div', { class: 'apply-head' }, '✨ Changes from your conversation'),
      cc.reason ? el('div', { class: 'apply-summary' }, cc.reason) : null,
      el('ul', { class: 'apply-list' }, changes.map((c) => el('li', {}, label(c)))),
    ].filter(Boolean)));
  }

  const applyBtn = el('button', { class: 'btn btn-primary full', onClick: async () => {
    applyBtn.disabled = true;
    let profileChanged = false;
    for (const c of changes) {
      if (c.kind === 'water') { plant.profile.water = c.to; profileChanged = true; }
      else if (c.kind === 'feed') { plant.profile.fertilize = c.to; profileChanged = true; }
      else if (c.kind === 'light') { plant.profile.light = c.to; profileChanged = true; }
    }
    if (profileChanged) await db.putPlant(plant);
    const notes = [parsed.summary, parsed.assessment, parsed.log_note].filter(Boolean).join(' — ') || 'Imported from my AI conversation';
    await logCare(plant.id, 'health', todayISO(), { health: parsed.condition || undefined, notes });
    toast(changes.length ? 'Imported — schedule updated & saved to log' : 'Imported to health log');
    closeDialog();
    render();
  } }, changes.length ? 'Apply & save to log' : 'Save to health log');
  container.append(applyBtn);
}

// Reusable photo input with BOTH a "Take photo" (opens the camera on phones via
// the `capture` hint) and a "Choose" (file library) option, plus a live preview.
// onPicked(dataUrl) fires with a resized JPEG data URL when a photo is selected.
function photoField({ initial = null, big = true, placeholder = '📷 Take or choose a photo', onPicked } = {}) {
  const preview = el('div', { class: big ? 'photo-preview big' : 'photo-preview' },
    initial ? [el('img', { src: initial, alt: 'preview' })] : placeholder);

  async function handle(file) {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataURL(file);
      clear(preview);
      preview.append(el('img', { src: dataUrl, alt: 'preview' }));
      if (onPicked) onPicked(dataUrl);
    } catch { toast('Could not load that image'); }
  }

  // capture="environment" nudges phones to open the rear camera directly.
  const takeInput = el('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'hidden-file' });
  takeInput.addEventListener('change', () => handle(takeInput.files[0]));
  const chooseInput = el('input', { type: 'file', accept: 'image/*', class: 'hidden-file' });
  chooseInput.addEventListener('change', () => handle(chooseInput.files[0]));

  const node = el('div', { class: 'photo-field' }, [
    el('label', { class: 'photo-preview-wrap' }, [preview, chooseInput]),
    el('div', { class: 'photo-actions' }, [
      el('label', { class: 'photo-action' }, ['📷 Take photo', takeInput]),
      el('label', { class: 'photo-action' }, ['🖼️ Choose', el('input', { type: 'file', accept: 'image/*', class: 'hidden-file',
        onChange: (e) => handle(e.target.files[0]) })]),
    ]),
  ]);
  return { node, preview };
}

function photoPicker(state, big = false) {
  const { node } = photoField({ initial: state.dataUrl || null, big, onPicked: (d) => { state.dataUrl = d; } });
  return { node };
}

// Log a growth measurement (height and/or leaf count).
function openGrowthDialog(plant) {
  const dateInput = el('input', { type: 'date', value: todayISO(), max: todayISO(), class: 'field' });
  const heightInput = el('input', { type: 'number', min: '0', step: '0.5', class: 'field', placeholder: 'e.g. 24', inputmode: 'decimal' });
  const leavesInput = el('input', { type: 'number', min: '0', step: '1', class: 'field', placeholder: 'optional', inputmode: 'numeric' });
  const notes = el('input', { class: 'field', placeholder: 'Optional note (new leaf, flower bud…)' });
  const m = modal([
    el('h3', { class: 'modal-title' }, 'Log a measurement'),
    labeled('Date', dateInput),
    labeled('Height (cm)', heightInput),
    labeled('Leaf count', leavesInput),
    labeled('Note', notes),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn btn-ghost', onClick: () => m.close() }, 'Cancel'),
      el('button', { class: 'btn btn-primary', onClick: async () => {
        const height = heightInput.value !== '' ? +heightInput.value : null;
        const leaves = leavesInput.value !== '' ? +leavesInput.value : null;
        if (height == null && leaves == null && !notes.value.trim()) { toast('Enter a height or leaf count'); return; }
        const bits = [];
        if (height != null) bits.push(`${height} cm`);
        if (leaves != null) bits.push(`${leaves} leaves`);
        const noteStr = [bits.join(' · '), notes.value.trim()].filter(Boolean).join(' — ');
        await logCare(plant.id, 'growth', dateInput.value, {
          height: height != null ? height : undefined,
          leaves: leaves != null ? leaves : undefined,
          notes: noteStr,
        });
        m.close(); toast('Measurement logged'); render();
      } }, 'Save'),
    ]),
  ]);
}

// Minimal SVG line chart of numeric points over time.
function growthChart(points) {
  const W = 320, H = 120, pad = 14;
  const xs = points.map((p) => p.date.getTime());
  const ys = points.map((p) => p.value);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = (maxX - minX) || 1;
  const spanY = (maxY - minY) || 1;
  const px = (t) => pad + ((t - minX) / spanX) * (W - pad * 2);
  const py = (v) => H - pad - ((v - minY) / spanY) * (H - pad * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${px(p.date.getTime()).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ');
  const dots = points.map((p) => `<circle cx="${px(p.date.getTime()).toFixed(1)}" cy="${py(p.value).toFixed(1)}" r="3" fill="currentColor"/>`).join('');
  const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}</svg>`;
  return el('div', { class: 'growth-chart', html: svg });
}

// A one-tap camera button that saves a progress/health photo straight to the
// plant's log (opens the camera directly on phones via `capture`).
function quickPhotoButton(plant, { className = 'btn btn-secondary full', label = '📷 Add progress photo', stopProp = false } = {}) {
  const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'hidden-file' });
  input.addEventListener('change', async () => {
    const file = input.files[0]; if (!file) return;
    try {
      const dataUrl = await fileToResizedDataURL(file);
      await logCare(plant.id, 'photo', todayISO(), { photo: dataUrl });
      if (!plant.photo) { plant.photo = dataUrl; await db.putPlant(plant); }
      toast('Progress photo added');
      render();
    } catch { toast('Could not save that photo'); }
  });
  const attrs = { class: className };
  if (stopProp) attrs.onClick = (e) => e.stopPropagation();
  return el('label', attrs, [label, input]);
}

function labeled(label, field) {
  return el('label', { class: 'form-row' }, [el('span', { class: 'form-label' }, label), field]);
}

function segChip(value, label, onClick) {
  return el('button', { class: `seg-chip seg-${value}`, type: 'button', dataset: { value }, onClick }, label);
}

function confirmDelete(plant) {
  const m = modal([
    el('h3', { class: 'modal-title' }, `Delete ${plant.name}?`),
    el('p', { class: 'modal-text' }, 'This removes the plant and its entire care history. This cannot be undone.'),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn btn-ghost', onClick: () => m.close() }, 'Cancel'),
      el('button', { class: 'btn btn-danger', onClick: async () => {
        await db.deletePlant(plant.id); m.close(); toast('Plant deleted'); navigate('/plants');
      } }, 'Delete'),
    ]),
  ]);
}

// =========================================================================
// ADD / EDIT PLANT
// =========================================================================

route(/^\/add$/, () => plantForm(null));
route(/^\/edit\/(.+)$/, async (id) => {
  const plant = await db.getPlant(id);
  if (!plant) { navigate('/plants'); return; }
  plantForm(plant);
});

function plantForm(existing) {
  const isEdit = !!existing;
  const settings = getSettings();
  const now = new Date();

  const model = existing
    ? JSON.parse(JSON.stringify(existing))
    : {
        id: db.uid('pl'), name: '', speciesId: '', latin: '', location: '', potSize: '',
        acquiredDate: null, photo: null, conditions: {}, profile: { ...DEFAULT_PROFILE }, createdAt: new Date().toISOString(),
      };
  if (!model.conditions) model.conditions = {};

  const view = el('div', { class: 'view' });
  view.append(viewHeader(isEdit ? 'Edit plant' : 'Add plant', { back: isEdit ? `/plant/${model.id}` : '/plants' }));

  const form = el('div', { class: 'form' });

  // Photo — take with the camera or choose from the library.
  const photoState = { dataUrl: model.photo };
  const idNote = el('div', { class: 'id-note' });
  const idBtn = el('button', { class: 'btn btn-secondary full', type: 'button', style: 'display:none' }, '✨ Identify & assess from photo');
  const photoFieldEl = photoField({
    initial: model.photo,
    big: true,
    onPicked: (d) => { photoState.dataUrl = d; idBtn.style.display = ''; clear(idNote); },
  });
  form.append(photoFieldEl.node);

  idBtn.addEventListener('click', async () => {
    if (!photoState.dataUrl) return;
    if (!hasApiKey()) {
      clear(idNote);
      idNote.append('Add your Anthropic API key in Settings to use AI identification.');
      return;
    }
    idBtn.disabled = true; idBtn.textContent = 'Looking…';
    try {
      const a = await analyzePlant(photoState.dataUrl, { season: seasonForDate(now, settings.hemisphere) });
      clear(idNote);
      if (a.is_plant === false) {
        idNote.append("That doesn't look like a plant — try another photo.");
      } else {
        if (a.species_guess && !latinInput.value) latinInput.value = a.species_guess;
        if (a.species_guess && !nameInput.value) nameInput.value = a.species_guess;
        idNote.append(el('div', {}, `${a.headline || ''} ${a.assessment || ''}`.trim()));
      }
    } catch (e) {
      clear(idNote);
      idNote.append('⚠️ ' + (e instanceof AIError ? e.message : 'Could not analyze that photo.'));
    } finally {
      idBtn.disabled = false; idBtn.textContent = '✨ Identify & assess from photo';
    }
  });
  if (isEdit && model.photo) idBtn.style.display = '';
  form.append(idBtn, idNote);

  // Name
  const nameInput = el('input', { class: 'field', placeholder: 'e.g. Monstera by the window', value: model.name });
  form.append(labeled('Nickname *', nameInput));

  // Species picker
  const speciesSel = el('select', { class: 'field' });
  buildSpeciesOptions(speciesSel, model.speciesId || (isEdit ? '__custom' : ''));

  const tipBox = el('div', { class: 'tips-box small' });
  function refreshFromSpecies(applyProfile) {
    const id = speciesSel.value;
    if (id && id !== '__custom') {
      const s = getSpecies(id);
      if (applyProfile) {
        model.profile = profileFromSpecies(id);
        model.speciesId = id;
        model.latin = s.latin;
        latinInput.value = s.latin;
        syncAdvancedInputs();
      }
      clear(tipBox); tipBox.append('💡 ', s.tips);
      tipBox.style.display = '';
    } else {
      model.speciesId = '';
      tipBox.style.display = 'none';
    }
    if (customBox) customBox.style.display = (speciesSel.value === '__custom') ? '' : 'none';
  }
  speciesSel.addEventListener('change', () => refreshFromSpecies(true));
  form.append(labeled('Species', speciesSel));
  form.append(tipBox);

  // Not in our library? Look up care details with AI.
  const lookupNameInput = el('input', { class: 'field', placeholder: 'e.g. Bird of Paradise, Strelitzia' });
  const lookupBtn = el('button', { class: 'btn btn-secondary full', type: 'button' }, '✨ Look up care info');
  const lookupNote = el('div', { class: 'id-note' });
  const customBox = el('div', { class: 'custom-box', style: 'display:none' }, [
    el('div', { class: 'hint' }, 'Not in the list? Type the species name and I’ll fetch its care details and fill the schedule for you.'),
    labeled('Species name', lookupNameInput),
    lookupBtn,
    lookupNote,
  ]);
  form.append(customBox);

  // Latin / details
  const latinInput = el('input', { class: 'field', placeholder: 'Latin name (optional)', value: model.latin });
  form.append(labeled('Latin name', latinInput));
  const locInput = el('input', { class: 'field', placeholder: 'e.g. Living room, south window', value: model.location });
  form.append(labeled('Location', locInput));
  const acquiredInput = el('input', { type: 'date', class: 'field', value: model.acquiredDate ? toDateInputValue(model.acquiredDate) : todayISO() });
  form.append(labeled('Acquired / potted on', acquiredInput));

  // Last watered — so a plant you've had a while starts with an accurate schedule.
  const lastWateredInput = el('input', { type: 'date', class: 'field', max: todayISO() });
  if (!isEdit) {
    form.append(labeled('Last watered (optional)', lastWateredInput));
    form.append(el('div', { class: 'hint bg-hint' }, 'Had it a while? Set when you last watered it and the schedule will count from there. Leave blank if it’s brand new.'));
  }

  // Advanced schedule (prefilled from species, editable)
  const adv = el('div', { class: 'advanced' });
  const advToggle = el('button', { class: 'advanced-toggle', type: 'button' }, '⚙️ Watering & feeding schedule');
  const advBody = el('div', { class: 'advanced-body' });

  const waterInput = el('input', { type: 'number', min: '1', max: '120', class: 'field', value: model.profile.water });
  const winterSel = el('select', { class: 'field' }, [
    el('option', { value: '1.2' }, 'Barely (tropicals in warm homes)'),
    el('option', { value: '1.6' }, 'Noticeably less'),
    el('option', { value: '2.0' }, 'Much less (typical succulents)'),
    el('option', { value: '3.0' }, 'Almost stop (cacti, dormant)'),
  ]);
  winterSel.value = nearestWinter(model.profile.winterFactor);
  const feedInput = el('input', { type: 'number', min: '0', max: '180', class: 'field', value: model.profile.fertilize });
  const lightSel = el('select', { class: 'field' }, Object.entries(LIGHT).map(([k, v]) => el('option', { value: k }, v)));
  lightSel.value = model.profile.light;

  advBody.append(
    labeled('Water every … days (growing season)', waterInput),
    labeled('Reduce watering in winter', winterSel),
    labeled('Fertilize every … days (0 = rarely)', feedInput),
    labeled('Light preference', lightSel),
    el('div', { class: 'hint' }, 'These are prefilled from the species and adjust automatically by season. Tweak if your conditions differ.'),
  );
  function syncAdvancedInputs() {
    waterInput.value = model.profile.water;
    winterSel.value = nearestWinter(model.profile.winterFactor);
    feedInput.value = model.profile.fertilize;
    lightSel.value = model.profile.light;
  }
  advToggle.addEventListener('click', () => adv.classList.toggle('open'));
  adv.append(advToggle, advBody);
  form.append(adv);
  if (isEdit) adv.classList.add('open');

  // Pot & spot conditions — personalize the watering frequency.
  const condOpt = (cur, opts) => {
    const s = el('select', { class: 'field' });
    s.append(el('option', { value: '' }, '—'));
    for (const [v, l] of opts) s.append(el('option', { value: v }, l));
    s.value = cur || '';
    return s;
  };
  const potSizeSel = condOpt(model.conditions.potSize, [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']]);
  const potMaterialSel = condOpt(model.conditions.potMaterial, [['terracotta', 'Terracotta / clay'], ['plastic', 'Plastic'], ['ceramic', 'Glazed ceramic'], ['metal', 'Metal']]);
  const drainageSel = condOpt(model.conditions.drainage, [['yes', 'Has drainage holes'], ['no', 'No drainage']]);
  const lightSpotSel = condOpt(model.conditions.lightSpot, [['low', 'Low light'], ['medium', 'Medium / bright indirect'], ['bright', 'Bright / direct sun']]);
  const currentConditions = () => ({
    potSize: potSizeSel.value || undefined,
    potMaterial: potMaterialSel.value || undefined,
    drainage: drainageSel.value || undefined,
    lightSpot: lightSpotSel.value || undefined,
  });

  // Live preview of the effective interval (base × season × pot/spot).
  const preview = el('div', { class: 'interval-preview' });
  function refreshPreview() {
    const p = { ...model.profile, water: +waterInput.value || 7, winterFactor: +winterSel.value };
    const eff = effectiveWaterInterval(p, now, settings.hemisphere, currentConditions());
    const season = seasonForDate(now, settings.hemisphere);
    clear(preview);
    preview.append(`${SEASON_META[season].emoji} Right now this waters about every ${eff} day${eff === 1 ? '' : 's'}.`);
  }
  [waterInput, winterSel, potSizeSel, potMaterialSel, drainageSel, lightSpotSel].forEach((i) => i.addEventListener('input', refreshPreview));
  form.append(el('div', { class: 'cond-section' }, [
    el('h2', { class: 'section-title' }, 'This plant’s pot & spot'),
    el('div', { class: 'hint bg-hint' }, 'Optional — tailors watering to your actual pot and where it sits (terracotta and small pots dry out faster; low light stays wet longer).'),
    labeled('Pot size', potSizeSel),
    labeled('Pot material', potMaterialSel),
    labeled('Drainage', drainageSel),
    labeled('Light in its spot', lightSpotSel),
    preview,
  ]));
  refreshPreview();

  refreshFromSpecies(false);

  // Gentle safeguard: warn (never block) when the schedule is far from the
  // species' preferences, with a one-tap "use recommended".
  const warnBox = el('div', { class: 'sched-warn' });
  function refreshWarnings() {
    clear(warnBox);
    const sid = (speciesSel.value && speciesSel.value !== '__custom') ? speciesSel.value : '';
    const warns = scheduleWarnings({ water: +waterInput.value || 0, fertilize: +feedInput.value || 0 }, sid);
    for (const w of warns) {
      warnBox.append(el('div', { class: 'warn-row' }, [
        el('div', { class: 'warn-msg' }, ['⚠️ ', w.message]),
        el('button', { class: 'warn-btn', type: 'button', onClick: () => {
          if (w.field === 'water') waterInput.value = w.recommended;
          else feedInput.value = w.recommended;
          refreshWarnings();
          refreshPreview();
        } }, `Use ${w.recommended} days`),
      ]));
    }
  }
  waterInput.addEventListener('input', refreshWarnings);
  feedInput.addEventListener('input', refreshWarnings);
  // Runs after refreshFromSpecies has reset the inputs, so the preview + warnings reflect the new species.
  speciesSel.addEventListener('change', () => setTimeout(() => { refreshWarnings(); refreshPreview(); }, 0));
  form.append(warnBox);
  refreshWarnings();

  // AI species care lookup for custom plants.
  lookupBtn.addEventListener('click', async () => {
    const q = lookupNameInput.value.trim() || nameInput.value.trim();
    clear(lookupNote);
    if (!q) { lookupNote.append('Type a species name first.'); return; }
    if (!hasApiKey()) { lookupNote.append('Add your Anthropic API key in Settings to look up species.'); return; }
    lookupBtn.disabled = true; lookupBtn.textContent = 'Looking up…';
    try {
      const c = await lookupSpeciesCare(q, photoState.dataUrl || null);
      clear(lookupNote);
      if (!c.matched) {
        lookupNote.append('⚠️ ' + (c.note || 'Couldn’t identify that species — try a more specific name.'));
      } else {
        Object.assign(model.profile, {
          water: Math.max(1, c.water_interval_days || model.profile.water),
          winterFactor: c.winter_factor || model.profile.winterFactor,
          fertilize: Math.max(0, Number.isInteger(c.fertilize_interval_days) ? c.fertilize_interval_days : model.profile.fertilize),
          feedWinter: !!c.feed_winter,
          light: c.light || model.profile.light,
          humidity: c.humidity || model.profile.humidity,
          tempMin: Number.isFinite(c.temp_min_c) ? c.temp_min_c : model.profile.tempMin,
          toxic: c.toxicity || model.profile.toxic,
          difficulty: c.difficulty || model.profile.difficulty,
          soil: c.soil || model.profile.soil,
          tips: c.tips || model.profile.tips,
        });
        if (c.latin_name && !latinInput.value) latinInput.value = c.latin_name;
        if (c.common_name && !nameInput.value) nameInput.value = c.common_name;
        syncAdvancedInputs(); refreshPreview(); refreshWarnings();
        adv.classList.add('open');
        // Save to the reusable library and select it in the picker.
        const savedId = await saveLookedUpSpecies(c);
        model.speciesId = savedId;
        buildSpeciesOptions(speciesSel, savedId);
        refreshFromSpecies(false); // show the species tip + hide the custom box
        toast(`Saved ${c.common_name || q} to your library`);
      }
    } catch (e) {
      clear(lookupNote);
      lookupNote.append('⚠️ ' + (e instanceof AIError ? e.message : 'Lookup failed. Please try again.'));
    } finally {
      lookupBtn.disabled = false; lookupBtn.textContent = '✨ Look up care info';
    }
  });

  // Save
  form.append(el('div', { class: 'form-actions' }, [
    el('button', { class: 'btn btn-primary full', onClick: async () => {
      if (!nameInput.value.trim()) { toast('Give your plant a nickname'); nameInput.focus(); return; }
      model.name = nameInput.value.trim();
      model.latin = latinInput.value.trim();
      model.location = locInput.value.trim();
      model.acquiredDate = acquiredInput.value ? dateInputToISO(acquiredInput.value) : null;
      model.photo = photoState.dataUrl || null;
      if (speciesSel.value === '__custom' || !speciesSel.value) model.speciesId = '';
      else model.speciesId = speciesSel.value;
      model.profile.water = Math.max(1, +waterInput.value || 7);
      model.profile.winterFactor = +winterSel.value || 1.5;
      model.profile.fertilize = Math.max(0, +feedInput.value || 0);
      model.profile.light = lightSel.value;
      model.conditions = currentConditions();
      await db.putPlant(model);
      if (!isEdit && lastWateredInput.value) {
        await logCare(model.id, 'water', lastWateredInput.value);
      }
      toast(isEdit ? 'Plant updated' : 'Plant added');
      navigate(`/plant/${model.id}`);
    } }, isEdit ? 'Save changes' : 'Add plant'),
  ]));

  view.append(form);
  app.append(view);
}

function nearestWinter(f) {
  const opts = [1.2, 1.6, 2.0, 3.0];
  let best = opts[0];
  for (const o of opts) if (Math.abs(o - f) < Math.abs(best - f)) best = o;
  return String(best);
}

// =========================================================================
// CARE GUIDE (species library) + DIAGNOSTICS
// =========================================================================

route(/^\/guide$/, () => {
  const view = el('div', { class: 'view' });
  view.append(viewHeader('Care Guide'));

  view.append(el('div', { class: 'guide-tabs' }, [
    el('button', { class: 'guide-tab active' }, 'Plants'),
    el('button', { class: 'guide-tab', onClick: () => navigate('/diagnose') }, 'Troubleshoot'),
  ]));

  const search = el('input', { class: 'field search', placeholder: '🔍 Search plants…' });
  view.append(search);

  const list = el('div', { class: 'guide-list' });
  function draw(filter = '') {
    clear(list);
    const q = filter.toLowerCase();
    allSpecies().filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.latin || '').toLowerCase().includes(q) ||
      (s.aka || []).some((a) => a.toLowerCase().includes(q)),
    ).forEach((s) => {
      list.append(el('div', { class: 'guide-row', onClick: () => navigate(`/guide/${s.id}`) }, [
        el('span', { class: 'guide-emoji' }, categoryEmoji(s.category)),
        el('div', { class: 'guide-row-main' }, [
          el('div', { class: 'guide-name' }, s.name),
          el('div', { class: 'guide-latin' }, s.latin),
        ]),
        isCustomSpecies(s.id) ? el('span', { class: 'diff saved-tag' }, 'Saved') : el('span', { class: `diff diff-${s.difficulty}` }, cap(s.difficulty)),
      ]));
    });
    if (!list.children.length) list.append(el('div', { class: 'muted-box' }, 'No matches.'));
  }
  search.addEventListener('input', () => draw(search.value));
  draw();
  view.append(list);
  app.append(view);
});

route(/^\/guide\/(.+)$/, (id) => {
  const s = getSpecies(id);
  if (!s) { navigate('/guide'); return; }
  const view = el('div', { class: 'view' });
  view.append(viewHeader(s.name, { back: '/guide' }));
  view.append(el('div', { class: 'guide-hero' }, [
    el('div', { class: 'guide-hero-emoji' }, categoryEmoji(s.category)),
    el('div', {}, [
      el('div', { class: 'guide-hero-latin' }, s.latin),
      (s.aka && s.aka.length) ? el('div', { class: 'guide-aka' }, 'aka ' + s.aka.join(', ')) : null,
      el('span', { class: `diff diff-${s.difficulty}` }, cap(s.difficulty) + ' care'),
    ]),
  ]));
  view.append(el('div', { class: 'care-grid' }, [
    careItem('☀️', 'Light', LIGHT[s.light] || s.light),
    careItem('💧', 'Water', `Every ${s.water} days (growing season)`),
    careItem('❄️', 'Winter', winterWords(s.winterFactor)),
    careItem('💦', 'Humidity', s.humidity),
    careItem('🌡️', 'Min temp', `${s.tempMin}°C`),
    careItem('🌱', 'Feed', s.fertilize ? `Every ${s.fertilize} days in season` : 'Rarely'),
    careItem('🪴', 'Soil', s.soil),
    careItem('🐾', 'Toxicity', s.toxic),
  ]));
  view.append(el('div', { class: 'tips-box' }, ['💡 ', s.tips]));
  view.append(el('div', { class: 'form-actions' }, [
    el('button', { class: 'btn btn-primary full', onClick: () => {
      navigate('/add');
      // preselect after navigation
      setTimeout(() => {
        const sel = document.querySelector('.form select');
        if (sel) { sel.value = s.id; sel.dispatchEvent(new Event('change')); }
      }, 60);
    } }, `＋ Add my ${s.name}`),
  ]));
  if (isCustomSpecies(s.id)) {
    view.append(el('div', { class: 'danger-zone' }, [
      el('button', { class: 'text-danger', onClick: async () => {
        await db.deleteCustomSpecies(s.id);
        await reloadCustomSpecies();
        toast('Removed from your library');
        navigate('/guide');
      } }, '🗑️ Remove from my library'),
    ]));
  }
  app.append(view);
});

function winterWords(f) {
  if (f >= 2.5) return 'Almost stop watering';
  if (f >= 1.8) return 'Water much less';
  if (f >= 1.4) return 'Water noticeably less';
  return 'Only slightly less';
}

route(/^\/diagnose$/, () => {
  const view = el('div', { class: 'view' });
  view.append(viewHeader('Troubleshoot'));
  view.append(el('div', { class: 'guide-tabs' }, [
    el('button', { class: 'guide-tab', onClick: () => navigate('/guide') }, 'Plants'),
    el('button', { class: 'guide-tab active' }, 'Troubleshoot'),
  ]));
  view.append(el('p', { class: 'diagnose-intro' }, "What's wrong with your plant? Pick the symptom you see."));
  const grid = el('div', { class: 'symptom-grid' });
  SYMPTOMS.forEach((s) => {
    grid.append(el('button', { class: 'symptom-card', onClick: () => navigate(`/diagnose/${s.id}`) }, [
      el('span', { class: 'symptom-emoji' }, s.emoji),
      el('span', { class: 'symptom-title' }, s.title),
    ]));
  });
  view.append(grid);
  app.append(view);
});

route(/^\/diagnose\/(.+)$/, (id) => {
  const s = getSymptom(id);
  if (!s) { navigate('/diagnose'); return; }
  const view = el('div', { class: 'view' });
  view.append(viewHeader(s.title, { back: '/diagnose' }));
  view.append(el('div', { class: 'diagnose-head' }, [el('span', { class: 'diagnose-emoji' }, s.emoji), 'Likely causes, most common first:']));
  s.causes.forEach((c, i) => {
    view.append(el('div', { class: 'cause-card' }, [
      el('div', { class: 'cause-name' }, [el('span', { class: 'cause-num' }, String(i + 1)), c.name]),
      el('div', { class: 'cause-signs' }, [el('b', {}, 'Signs: '), c.signs]),
      el('div', { class: 'cause-fix' }, [el('b', {}, 'What to do: '), c.fix]),
    ]));
  });
  app.append(view);
});

// =========================================================================
// SETTINGS
// =========================================================================

route(/^\/settings$/, async () => {
  const settings = getSettings();
  const [plants, events] = await Promise.all([db.getPlants(), db.getEvents()]);
  const view = el('div', { class: 'view' });
  view.append(viewHeader('Settings'));

  // Install app
  const installChildren = [];
  if (isStandalone()) {
    installChildren.push(el('div', { class: 'data-stat' }, '✅ You’re running the installed app.'));
  } else if (deferredInstallPrompt) {
    installChildren.push(el('button', { class: 'btn btn-primary full', onClick: triggerInstall }, '📲 Install on this device'));
    installChildren.push(el('div', { class: 'hint' }, 'Adds Plant Tracker to your home screen as a standalone app — its own icon, full-screen, works offline.'));
  } else {
    installChildren.push(el('div', { class: 'hint' }, [
      'No install button? This page has to be opened from its secure ', el('b', {}, 'https'), ' address to install as a real app. Once it is:',
      el('br', {}), el('br', {}),
      el('b', {}, '📱 Android (Chrome):'), ' ⋮ menu → “Add to Home screen”, then tap ', el('b', {}, 'Install'),
      ' on the popup (that installs the real app, not a shortcut).',
      el('br', {}), el('br', {}),
      el('b', {}, '🍎 iPhone (Safari):'), ' Share button → “Add to Home Screen”.',
      el('br', {}), el('br', {}),
      'On a home-screen icon: a real app opens full-screen with no address bar and appears in your app list; a plain shortcut opens inside a browser tab. If you only get a shortcut, the page isn’t on https yet — the README has a 1-minute step to fix that.',
    ]));
  }
  view.append(settingsGroup('Install app', installChildren));

  // Hemisphere
  const hemiSel = el('select', { class: 'field', onChange: (e) => { saveSettings({ hemisphere: e.target.value }); toast('Saved'); } }, [
    el('option', { value: 'N' }, 'Northern hemisphere'),
    el('option', { value: 'S' }, 'Southern hemisphere'),
  ]);
  hemiSel.value = settings.hemisphere;
  view.append(settingsGroup('Location', [
    labeled('Hemisphere', hemiSel),
    el('div', { class: 'hint' }, 'Determines seasons, which drive the watering and feeding adjustments.'),
  ]));

  // Theme
  const themeSel = el('select', { class: 'field', onChange: (e) => { saveSettings({ theme: e.target.value }); applyTheme(); toast('Saved'); } }, [
    el('option', { value: 'auto' }, 'Match device'),
    el('option', { value: 'light' }, 'Light'),
    el('option', { value: 'dark' }, 'Dark'),
  ]);
  themeSel.value = settings.theme;
  view.append(settingsGroup('Appearance', [labeled('Theme', themeSel)]));

  // Notifications
  const notifBtn = el('button', { class: 'btn btn-secondary', onClick: async () => {
    if (!('Notification' in window)) { toast('Notifications not supported here'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') { saveSettings({ notifications: true }); toast('Reminders on'); render(); }
    else toast('Permission denied');
  } }, settings.notifications && Notification.permission === 'granted' ? '✅ Reminders enabled' : 'Enable reminders');
  view.append(settingsGroup('Reminders', [
    notifBtn,
    el('div', { class: 'hint' }, 'You’ll always get a “what needs care today” summary when you open or return to the app. On an installed Android app, it can also remind you about once a day in the background (Chrome decides the exact timing). iPhone doesn’t allow background reminders without a server, so there it’s open/reopen only.'),
  ]));

  // AI health checks
  const keyInput = el('input', {
    type: 'password', class: 'field', placeholder: 'sk-ant-…', value: settings.apiKey || '',
    autocomplete: 'off', spellcheck: 'false',
  });
  keyInput.addEventListener('change', () => { saveSettings({ apiKey: keyInput.value.trim() }); toast('Saved'); });
  const showKey = el('input', { type: 'checkbox' });
  showKey.addEventListener('change', () => { keyInput.type = showKey.checked ? 'text' : 'password'; });
  const modelSel = el('select', { class: 'field', onChange: (e) => { saveSettings({ aiModel: e.target.value }); toast('Saved'); } },
    AI_MODELS.map((m) => el('option', { value: m.id }, m.label)));
  modelSel.value = settings.aiModel || 'claude-opus-4-8';

  view.append(settingsGroup('AI health checks', [
    labeled('Anthropic API key', keyInput),
    el('label', { class: 'checkline' }, [showKey, ' Show key']),
    labeled('Model', modelSel),
    el('div', { class: 'hint' }, [
      'Powers the ✨ AI health check — photograph a plant and get an expert read on its condition. ',
      'Get a key at ', el('b', {}, 'console.anthropic.com'), '. It’s stored only in this browser and used only for your health checks. ',
      'This is the one feature that sends data off your device: the photo you choose is sent to Anthropic for analysis.',
    ]),
  ]));

  // Data / backup
  view.append(settingsGroup('Your data', [
    el('div', { class: 'data-stat' }, `${plants.length} plant${plants.length === 1 ? '' : 's'} · ${events.length} log entr${events.length === 1 ? 'y' : 'ies'}`),
    el('button', { class: 'btn btn-secondary full', onClick: async () => {
      const data = await db.exportAll();
      download(`plant-tracker-backup-${todayISO()}.json`, JSON.stringify(data, null, 2));
      toast('Backup downloaded');
    } }, '⬇️ Export backup'),
    (() => {
      const input = el('input', { type: 'file', accept: 'application/json,.json', class: 'hidden-file' });
      input.addEventListener('change', async () => {
        const file = input.files[0]; if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          confirmImport(data);
        } catch { toast('Could not read that file'); }
      });
      return el('label', { class: 'btn btn-secondary full' }, ['⬆️ Import backup', input]);
    })(),
    el('div', { class: 'hint' }, 'Everything is stored privately in this browser. Export regularly — clearing browser data will erase your plants.'),
  ]));

  view.append(el('div', { class: 'about' }, [
    el('div', {}, `🌿 Plant Care Tracker · v${APP_VERSION}`),
    el('div', { class: 'hint' }, 'Local-first · offline · installable. Your plants stay on this device — only AI health-check photos are sent out, and only when you use that feature.'),
  ]));

  app.append(view);
});

function confirmImport(data) {
  const m = modal([
    el('h3', { class: 'modal-title' }, 'Import backup'),
    el('p', { class: 'modal-text' }, `This file has ${data.plants?.length || 0} plants and ${data.events?.length || 0} log entries. How should it be applied?`),
    el('div', { class: 'modal-actions col' }, [
      el('button', { class: 'btn btn-primary', onClick: async () => {
        try { await db.importAll(data, { merge: false }); await reloadCustomSpecies(); m.close(); toast('Replaced with backup'); render(); }
        catch (e) { toast(e.message); }
      } }, 'Replace everything'),
      el('button', { class: 'btn btn-secondary', onClick: async () => {
        try { await db.importAll(data, { merge: true }); await reloadCustomSpecies(); m.close(); toast('Merged backup'); render(); }
        catch (e) { toast(e.message); }
      } }, 'Merge into current'),
      el('button', { class: 'btn btn-ghost', onClick: () => m.close() }, 'Cancel'),
    ]),
  ]);
}

function settingsGroup(title, children) {
  return el('div', { class: 'settings-group' }, [el('h2', { class: 'section-title' }, title), ...children]);
}

// ---- Shared empty state -------------------------------------------------

function emptyState(emoji, title, text, btnLabel, onClick) {
  return el('div', { class: 'empty' }, [
    el('div', { class: 'empty-emoji' }, emoji),
    el('div', { class: 'empty-title' }, title),
    el('div', { class: 'empty-text' }, text),
    btnLabel ? el('button', { class: 'btn btn-primary', onClick }, btnLabel) : null,
  ].filter(Boolean));
}

// =========================================================================
// THEME + NOTIFICATIONS + BOOT
// =========================================================================

function applyTheme() {
  const { theme } = getSettings();
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

// Ask the browser to wake the service worker ~daily to show reminders even when
// the app is closed. Only works on installed PWAs on Chromium (Android Chrome/
// Edge); silently unsupported elsewhere (iOS/Safari/Firefox) — those rely on the
// on-open check below.
async function registerPeriodicSync(reg) {
  if (!('periodicSync' in reg)) return;
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state === 'granted') {
      await reg.periodicSync.register('plant-care-check', { minInterval: 24 * 60 * 60 * 1000 });
    }
  } catch { /* not supported here */ }
}

async function checkReminders() {
  const settings = getSettings();
  if (!settings.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const [plants, events] = await Promise.all([db.getPlants(), db.getEvents()]);
  const due = dueTasks(plants, events, now, settings.hemisphere, 0);
  const waterCount = due.filter((t) => t.type === 'water').length;
  const feedCount = due.filter((t) => t.type === 'fertilize').length;
  const photoCount = plants.filter((p) => photoStatus(p, events, now).due).length;
  const parts = [];
  if (waterCount) parts.push(`${waterCount} to water`);
  if (feedCount) parts.push(`${feedCount} to feed`);
  if (photoCount) parts.push(`${photoCount} due a progress photo`);
  if (!parts.length) return;
  try {
    new Notification('🌿 Plant care', {
      body: `${parts.join(', ')} today.`,
      tag: 'plant-care-daily',
    });
  } catch { /* ignore */ }
}

window.addEventListener('hashchange', render);

async function boot() {
  applyTheme();
  // Capture the install opportunity and reflect it in the UI when it appears.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    render();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    toast('Installed! Look for it on your home screen.');
    render();
  });
  await db.openDB();
  await reloadCustomSpecies();
  await render();
  // Check reminders shortly after open, then hourly while the app stays open.
  setTimeout(checkReminders, 4000);
  setInterval(checkReminders, 60 * 60 * 1000);
  // Register the service worker for offline + installability, and watch for updates.
  if ('serviceWorker' in navigator) {
    // When the controlling worker changes because we asked it to, reload into
    // the new version. (Guarded so the first-ever registration doesn't reload.)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (swUpdating) window.location.reload();
    });
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // A newer version was already waiting (updated while the app was closed).
      if (reg.waiting && navigator.serviceWorker.controller) showUpdatePrompt(reg.waiting);
      // A new version starts downloading now.
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdatePrompt(nw);
          }
        });
      });
      // Check for a new version hourly and whenever the app regains focus.
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => {});
      });
      // Best-effort background reminders (installed Chromium PWAs only).
      registerPeriodicSync(reg);
    }).catch(() => {});
  }
}

boot();
