// coach.js — Natural-language care coaching, generated locally (no AI, offline).
//
// Turns a plant's species profile + the current season into warm, human-sounding
// guidance — the "great choice, here's how to keep it thriving" message a
// knowledgeable friend would give you when you bring a new plant home.

import { getSpecies, LIGHT } from './species.js';
import { seasonForDate, SEASON_META, shouldFeed } from './season.js';
import { effectiveWaterInterval } from './schedule.js';

// Deterministic pick so a given plant always gets the same phrasing.
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pick(options, seed) {
  return options[seed % options.length];
}

const DIFFICULTY_OPENERS = {
  easy: [
    'Great pick — {name} is one of the most forgiving houseplants you can own.',
    'Lovely choice. {name} is famously easy-going, so you\'re starting on easy mode.',
    'Nice — {name} is a hardy, low-drama plant that\'s tough to kill.',
  ],
  moderate: [
    'Good choice — {name} isn\'t difficult, it just likes a bit of consistency.',
    'Nice pick. {name} is very doable once you settle into its rhythm.',
    '{name} is a rewarding plant — a little attention goes a long way.',
  ],
  hard: [
    'Bold choice — {name} is a bit particular, but stunning when it\'s happy.',
    '{name} has a reputation for being fussy, but you can absolutely keep it thriving.',
    'A striking pick. {name} rewards care and consistency, so let\'s set you up well.',
  ],
};

function speciesName(plant) {
  const s = plant.speciesId ? getSpecies(plant.speciesId) : null;
  return s ? s.name : (plant.latin || 'this plant');
}

// A short, friendly welcome paragraph for a newly-added (or existing) plant.
export function welcomeMessage(plant, settings, now = new Date()) {
  const s = plant.speciesId ? getSpecies(plant.speciesId) : null;
  const seed = hash(plant.id || plant.name || 'plant');
  const name = s ? s.name : (plant.latin || 'Your new plant');
  const diff = s ? s.difficulty : (plant.profile.difficulty || 'moderate');
  const opener = pick(DIFFICULTY_OPENERS[diff] || DIFFICULTY_OPENERS.moderate, seed).replace('{name}', name);

  const season = seasonForDate(now, settings.hemisphere);
  const meta = SEASON_META[season];
  const interval = effectiveWaterInterval(plant.profile, now, settings.hemisphere, plant.conditions);

  const light = LIGHT[plant.profile.light] || plant.profile.light;
  const waterLine = `Right now (${meta.label.toLowerCase()}), aim to water about every ${interval} day${interval === 1 ? '' : 's'} — always check that the top of the soil has dried first.`;
  const lightLine = `Give it ${light.toLowerCase()} and it'll be happy.`;

  return `${opener} ${waterLine} ${lightLine}`;
}

// Concrete, do-this-now care tips (the "X, Y and Z" list).
export function careTips(plant, settings, now = new Date()) {
  const s = plant.speciesId ? getSpecies(plant.speciesId) : null;
  const p = plant.profile;
  const season = seasonForDate(now, settings.hemisphere);
  const interval = effectiveWaterInterval(p, now, settings.hemisphere, plant.conditions);
  const feeding = shouldFeed(season, p.feedWinter);
  const tips = [];

  tips.push({
    icon: '💧',
    text: `Water roughly every ${interval} day${interval === 1 ? '' : 's'} this season — let the soil dry to the right depth between drinks rather than watering on a strict clock.`,
  });

  tips.push({
    icon: '☀️',
    text: `Place it in ${(LIGHT[p.light] || p.light).toLowerCase()}. Turn it now and then so it grows evenly.`,
  });

  if (p.fertilize) {
    const feed = settings.feed;
    const feedWith = (feed && feed.name)
      ? `${feed.name}${feed.dilute ? ' at about half strength' : ''}`
      : 'a balanced fertilizer at half strength';
    tips.push({
      icon: '🌱',
      text: feeding
        ? `Feed with ${feedWith} about every ${p.fertilize} days while it's actively growing.`
        : `Hold off on fertilizer for now — feeding resumes in spring when growth picks back up.`,
    });
  }

  if (p.humidity && /high/i.test(p.humidity)) {
    tips.push({ icon: '💦', text: `It likes ${p.humidity.toLowerCase()} humidity — group it with other plants or use a pebble tray, especially with heating on.` });
  }

  if (p.toxic && /toxic/i.test(p.toxic) && !/non-toxic|pet safe/i.test(p.toxic)) {
    tips.push({ icon: '🐾', text: `Keep it out of reach of pets and small children — ${p.toxic.toLowerCase()}.` });
  }

  const tipText = s ? s.tips : p.tips;
  if (tipText) {
    tips.push({ icon: '💡', text: tipText });
  }

  return tips;
}

// Flag a manually-entered schedule that's well outside the species' known-good
// range — a likely mistake — without ever forcing a change. Only applies when a
// species is known (custom plants have no reference to compare against).
// Threshold is deliberately lenient (2.5×) because real conditions vary a lot.
const OFF_RATIO = 2.5;

export function scheduleWarnings(profile, speciesId) {
  const s = speciesId ? getSpecies(speciesId) : null;
  if (!s) return [];
  const out = [];

  const w = Number(profile.water);
  if (w > 0 && s.water) {
    if (w <= s.water / OFF_RATIO) {
      out.push({
        field: 'water', recommended: s.water,
        message: `Your ${s.name} usually prefers watering about every ${s.water} days — every ${w} may be too often, and overwatering is the most common way houseplants die.`,
      });
    } else if (w >= s.water * OFF_RATIO) {
      out.push({
        field: 'water', recommended: s.water,
        message: `Your ${s.name} usually likes water about every ${s.water} days — every ${w} could let it dry out too much.`,
      });
    }
  }

  const f = Number(profile.fertilize);
  if (f > 0 && s.fertilize && f <= s.fertilize / OFF_RATIO) {
    out.push({
      field: 'fertilize', recommended: s.fertilize,
      message: `Feeding every ${f} days is a lot for your ${s.name} (it usually wants about every ${s.fertilize}); over-feeding can burn the roots.`,
    });
  }

  return out;
}
