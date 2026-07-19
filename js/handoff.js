// handoff.js — Move a plant's context to your own Claude/ChatGPT and back.
//
// buildHandoff() produces an all-encompassing brief (everything about the plant
// + the app's assessment) PLUS instructions telling the external AI to end its
// reply with a machine-readable ```plant-tracker block. parseHandoffImport()
// reads that block back so findings flow into the app consistently.

import { getSpecies, LIGHT } from './species.js';
import { seasonForDate, SEASON_META, shouldFeed } from './season.js';
import { effectiveWaterInterval } from './schedule.js';
import { fmtDate } from './util.js';

const HIST_LABEL = {
  water: 'Watered', fertilize: 'Fed', health: 'Health note', photo: 'Photo',
  repot: 'Repotted', prune: 'Pruned', mist: 'Misted', note: 'Note',
};

// The exact structure we ask the external AI to return, kept in one place so the
// export instructions and the import parser can never drift apart.
const IMPORT_TEMPLATE = [
  '```plant-tracker',
  '{',
  '  "condition": "good | ok | poor",',
  '  "summary": "one short sentence takeaway",',
  '  "assessment": "2-4 sentences explaining what is going on",',
  '  "care_changes": {',
  '    "water_interval_days": null,',
  '    "fertilize_interval_days": null,',
  '    "light": null,',
  '    "reason": ""',
  '  },',
  '  "next_steps": ["first thing to do", "second thing"],',
  '  "log_note": "a short note to save to the plant\'s health log"',
  '}',
  '```',
].join('\n');

// A closing prompt the user pastes into their AI to get a clean, importable
// summary. Built from the same template so the two can never drift apart.
export const SUMMARY_PROMPT = [
  "We're done — please summarise everything we concluded about my plant as a single block I can import into my plant-care app.",
  'Output ONLY the fenced code block below, with nothing before or after it. It must be valid JSON: straight quotes, no trailing commas, no comments. Use null for anything we didn\'t determine.',
  '',
  IMPORT_TEMPLATE,
].join('\n');

export function buildHandoff({ plant, events, settings, analysis }) {
  const now = new Date();
  const s = plant.speciesId ? getSpecies(plant.speciesId) : null;
  const p = plant.profile;
  const season = seasonForDate(now, settings.hemisphere);
  const eff = effectiveWaterInterval(p, now, settings.hemisphere);
  const feeding = shouldFeed(season, p.feedWinter);
  const speciesName = s ? `${s.name}${s.latin ? ` (${s.latin})` : ''}` : (plant.latin || 'unknown species');

  const L = [];
  L.push(`# Plant care hand-off — ${plant.name}`, '');
  L.push('I track this houseplant in a care app and want to keep troubleshooting it with you. Here is the full context so you can pick up seamlessly.', '');

  L.push('## The plant');
  L.push(`- Nickname: ${plant.name}`);
  L.push(`- Species: ${speciesName}`);
  if (plant.location) L.push(`- Location: ${plant.location}`);
  if (plant.acquiredDate) L.push(`- In my care since: ${fmtDate(plant.acquiredDate)}`);
  L.push(`- Hemisphere: ${settings.hemisphere === 'N' ? 'Northern' : 'Southern'}; current season: ${SEASON_META[season].label}`, '');

  L.push('## Current care routine');
  L.push(`- Watering: about every ${p.water} days (baseline); ~${eff} days right now in ${SEASON_META[season].label.toLowerCase()}`);
  L.push(`- Feeding: ${p.fertilize ? `every ${p.fertilize} days${feeding ? '' : ' (paused for the season)'}` : 'rarely'}`);
  L.push(`- Light: ${LIGHT[p.light] || p.light}`);
  L.push(`- Humidity preference: ${p.humidity}`);
  L.push(`- Minimum temperature: ${p.tempMin}°C`);
  L.push(`- Soil: ${p.soil}`);
  L.push(`- Toxicity: ${p.toxic}`);
  if (p.tips) L.push(`- Key care tip: ${p.tips}`);
  L.push('');

  const recent = events.slice(0, 15);
  if (recent.length) {
    L.push('## Recent care history (newest first)');
    for (const e of recent) {
      const label = HIST_LABEL[e.type] || e.type;
      const cond = e.health ? ` — ${e.health}` : '';
      const note = e.notes ? `: ${e.notes}` : '';
      L.push(`- ${fmtDate(e.date)} — ${label}${cond}${note}`);
    }
    L.push('');
  }

  if (analysis) {
    L.push("## The app's latest AI assessment");
    L.push(`- Condition: ${analysis.condition}`);
    if (analysis.headline) L.push(`- Headline: ${analysis.headline}`);
    if (analysis.assessment) L.push(`- Assessment: ${analysis.assessment}`);
    if (analysis.observations && analysis.observations.length) L.push(`- Observations: ${analysis.observations.join('; ')}`);
    if (analysis.next_steps && analysis.next_steps.length) L.push(`- Suggested next steps: ${analysis.next_steps.join('; ')}`);
    if (analysis.watch_for && analysis.watch_for.length) L.push(`- Watch for: ${analysis.watch_for.join('; ')}`);
    L.push('');
  }

  L.push('---', '');
  L.push('## How to help me');
  L.push('Please act as an expert houseplant advisor. Ask me any clarifying questions and help me diagnose and fix any issues. I can attach a photo of the plant in this chat if that would help.', '');
  L.push('IMPORTANT — so I can import your findings back into my app, END your reply with a single fenced code block in EXACTLY this format. Keep the ```plant-tracker fences, use only these fields, and use null when something is unknown. It must be valid JSON: straight quotes only, no trailing commas, no comments. Always include the block (even if nothing changes):', '');
  L.push(IMPORT_TEMPLATE);

  return L.join('\n');
}

// ---- Import ------------------------------------------------------------

const LIGHT_ENUM = ['low', 'medium', 'bright', 'full'];

// Forgive the small deviations LLMs occasionally produce: smart quotes,
// trailing commas, and // comments. Only cosmetic repairs — never changes values.
function repairJson(s) {
  return s
    .replace(/[“”]/g, '"')   // curly double quotes
    .replace(/[‘’]/g, "'")   // curly single quotes
    .replace(/\/\/[^\n\r]*/g, '')       // line comments
    .replace(/,(\s*[}\]])/g, '$1');     // trailing commas
}

function tryParse(str) {
  if (!str) return null;
  const t = str.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  const candidate = (start !== -1 && end !== -1 && end >= start) ? t.slice(start, end + 1) : t;
  for (const attempt of [t, candidate, repairJson(candidate)]) {
    try { return JSON.parse(attempt); } catch { /* try next */ }
  }
  return null;
}

function looksLikeFindings(o) {
  return o && typeof o === 'object' &&
    ('condition' in o || 'care_changes' in o || 'log_note' in o || 'next_steps' in o || 'assessment' in o);
}

function normalize(o) {
  const cc = (o.care_changes && typeof o.care_changes === 'object') ? o.care_changes : {};
  const asInt = (v) => (Number.isFinite(v) ? Math.round(v) : null);
  return {
    condition: ['good', 'ok', 'poor'].includes(o.condition) ? o.condition : null,
    summary: typeof o.summary === 'string' ? o.summary.trim() : '',
    assessment: typeof o.assessment === 'string' ? o.assessment.trim() : '',
    next_steps: Array.isArray(o.next_steps) ? o.next_steps.filter((x) => typeof x === 'string') : [],
    log_note: typeof o.log_note === 'string' ? o.log_note.trim() : '',
    care_changes: {
      water_interval_days: asInt(cc.water_interval_days),
      fertilize_interval_days: asInt(cc.fertilize_interval_days),
      light: LIGHT_ENUM.includes(cc.light) ? cc.light : null,
      reason: typeof cc.reason === 'string' ? cc.reason.trim() : '',
    },
  };
}

// Shared: find the first JSON object (in a fenced block, else the whole text)
// that satisfies `predicate`.
function firstJson(text, predicate) {
  if (!text || typeof text !== 'string') return null;
  const candidates = [];
  const fenceRe = /```[a-zA-Z-]*\s*\n?([\s\S]*?)```/g;
  let m;
  while ((m = fenceRe.exec(text)) !== null) candidates.push(m[1]);
  candidates.push(text); // whole-text fallback
  for (const c of candidates) {
    const obj = tryParse(c);
    if (obj && predicate(obj)) return obj;
  }
  return null;
}

// Extract structured findings from a pasted AI reply.
export function parseHandoffImport(text) {
  const obj = firstJson(text, looksLikeFindings);
  return obj ? normalize(obj) : null;
}

// ---- Species care lookup by paste ---------------------------------------

const SPECIES_TEMPLATE = [
  '```plant-species',
  '{',
  '  "common_name": "",',
  '  "latin_name": "",',
  '  "category": "tropical-foliage | succulent | fern | orchid | flowering | herb | other",',
  '  "water_interval_days": 7,',
  '  "winter_factor": 1.6,',
  '  "fertilize_interval_days": 30,',
  '  "feed_winter": false,',
  '  "light": "low | medium | bright | full",',
  '  "humidity": "e.g. Average",',
  '  "temp_min_c": 13,',
  '  "toxicity": "e.g. Toxic to pets",',
  '  "difficulty": "easy | moderate | hard",',
  '  "soil": "short soil recommendation",',
  '  "tips": "1-2 sentences: the key care tip and the most common mistake"',
  '}',
  '```',
].join('\n');

// A prompt the user pastes into their own AI to get importable care data.
export function speciesPrompt(name) {
  return [
    `I'm adding a houseplant${name ? ` — "${name}"` : ''} to my plant-care app, but the app has no care data for it. Give me accurate baseline INDOOR care data for this species.`,
    'Output ONLY the fenced code block below — valid JSON, straight quotes, no trailing commas, no comments. Field notes: water_interval_days = typical days between waterings in the growing season for an average indoor pot; winter_factor = multiply that by this in winter dormancy (~1.2 for tropicals in a warm home, up to 3.0 for cacti); light is one of low/medium/bright/full; temp_min_c = minimum safe temperature in Celsius.',
    '',
    SPECIES_TEMPLATE,
  ].join('\n');
}

const CATEGORY_ENUM = ['succulent', 'tropical-foliage', 'fern', 'orchid', 'flowering', 'herb', 'other'];

// Parse pasted species care data into the shape saveLookedUpSpecies expects.
export function parseSpeciesImport(text) {
  const o = firstJson(text, (x) => x && typeof x === 'object' &&
    ('water_interval_days' in x || 'latin_name' in x || 'common_name' in x));
  if (!o) return null;
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const int = (v, d) => (Number.isFinite(v) ? Math.round(v) : d);
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  return {
    matched: true,
    common_name: str(o.common_name),
    latin_name: str(o.latin_name),
    category: CATEGORY_ENUM.includes(o.category) ? o.category : 'other',
    water_interval_days: int(o.water_interval_days, 7),
    winter_factor: num(o.winter_factor, 1.5),
    fertilize_interval_days: int(o.fertilize_interval_days, 30),
    feed_winter: !!o.feed_winter,
    light: LIGHT_ENUM_SPOT.includes(o.light) ? o.light : 'medium',
    humidity: str(o.humidity) || 'Average',
    temp_min_c: int(o.temp_min_c, 13),
    toxicity: str(o.toxicity) || 'Unknown',
    difficulty: ['easy', 'moderate', 'hard'].includes(o.difficulty) ? o.difficulty : 'moderate',
    soil: str(o.soil) || 'Well-draining potting mix',
    tips: str(o.tips),
  };
}

const LIGHT_ENUM_SPOT = ['low', 'medium', 'bright', 'full'];
