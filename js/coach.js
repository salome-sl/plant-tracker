// coach.js — Natural-language care coaching, generated locally (no AI, offline).
//
// Turns a plant's species profile + the current season into warm, human-sounding
// guidance — the "great choice, here's how to keep it thriving" message a
// knowledgeable friend would give you when you bring a new plant home.

import { getSpecies, LIGHT } from './species.js';
import { seasonForDate, SEASON_META, shouldFeed } from './season.js';
import { effectiveWaterInterval, effectiveFeedInterval, plantCategory } from './schedule.js';
import { getLang, tl } from './i18n.js';

const SEASON_LABEL_NL = { spring: 'lente', summer: 'zomer', autumn: 'herfst', winter: 'winter' };

const DIFFICULTY_OPENERS_NL = {
  easy: [
    'Mooie keuze — {name} is een van de meest vergevingsgezinde kamerplanten die je kunt hebben.',
    'Leuke keuze. {name} staat bekend als heel makkelijk, dus je begint op easy mode.',
    'Fijn — {name} is een taaie, onverwoestbare plant.',
  ],
  moderate: [
    'Goede keuze — {name} is niet moeilijk, hij houdt gewoon van een beetje regelmaat.',
    'Leuke keuze. {name} is heel goed te doen zodra je zijn ritme te pakken hebt.',
    '{name} is een dankbare plant — een beetje aandacht doet veel.',
  ],
  hard: [
    'Gedurfde keuze — {name} is wat eigenwijs, maar prachtig als hij gelukkig is.',
    '{name} staat bekend als lastig, maar je kunt hem zeker gezond houden.',
    'Een opvallende keuze. {name} beloont zorg en regelmaat, dus laten we je goed op weg helpen.',
  ],
};

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
  const nl = getLang() === 'nl';
  const s = plant.speciesId ? getSpecies(plant.speciesId) : null;
  const seed = hash(plant.id || plant.name || 'plant');
  const name = s ? tl(s.name) : (plant.latin || (nl ? 'Je nieuwe plant' : 'Your new plant'));
  const diff = s ? s.difficulty : (plant.profile.difficulty || 'moderate');
  const openers = nl ? DIFFICULTY_OPENERS_NL : DIFFICULTY_OPENERS;
  const opener = pick(openers[diff] || openers.moderate, seed).replace('{name}', name);

  const season = seasonForDate(now, settings.hemisphere);
  const interval = effectiveWaterInterval(plant.profile, now, settings.hemisphere, plant.conditions);
  const light = tl(LIGHT[plant.profile.light] || plant.profile.light).toLowerCase();

  if (nl) {
    const seasonLbl = SEASON_LABEL_NL[season];
    const waterLine = `Op dit moment (${seasonLbl}) geef je ongeveer elke ${interval} dag${interval === 1 ? '' : 'en'} water — check altijd eerst of de bovenkant van de aarde droog is.`;
    const lightLine = `Zet 'm in ${light} en hij voelt zich prima.`;
    return `${opener} ${waterLine} ${lightLine}`;
  }

  const meta = SEASON_META[season];
  const waterLine = `Right now (${meta.label.toLowerCase()}), aim to water about every ${interval} day${interval === 1 ? '' : 's'} — always check that the top of the soil has dried first.`;
  const lightLine = `Give it ${light} and it'll be happy.`;
  return `${opener} ${waterLine} ${lightLine}`;
}

// Concrete, do-this-now care tips (the "X, Y and Z" list).
export function careTips(plant, settings, now = new Date()) {
  const nl = getLang() === 'nl';
  const s = plant.speciesId ? getSpecies(plant.speciesId) : null;
  const p = plant.profile;
  const season = seasonForDate(now, settings.hemisphere);
  const interval = effectiveWaterInterval(p, now, settings.hemisphere, plant.conditions);
  const feeding = shouldFeed(season, p.feedWinter);
  const light = tl(LIGHT[p.light] || p.light).toLowerCase();
  const tips = [];

  tips.push({
    icon: '💧',
    text: nl
      ? `Geef dit seizoen ongeveer elke ${interval} dag${interval === 1 ? '' : 'en'} water — laat de aarde tussen twee beurten tot de juiste diepte uitdrogen in plaats van op een strak schema te gieten.`
      : `Water roughly every ${interval} day${interval === 1 ? '' : 's'} this season — let the soil dry to the right depth between drinks rather than watering on a strict clock.`,
  });

  // How much, not just how often — the other half of watering, and the part that
  // stops people drowning a plant with daily splashes.
  tips.push({ icon: '🚿', text: wateringAmount(plant).text });

  tips.push({
    icon: '☀️',
    text: nl
      ? `Zet 'm in ${light}. Draai 'm af en toe zodat hij gelijkmatig groeit.`
      : `Place it in ${light}. Turn it now and then so it grows evenly.`,
  });

  if (p.fertilize) {
    const feed = settings.feed;
    const feedWith = (feed && feed.name)
      ? `${feed.name}${feed.dilute ? (nl ? ' op ongeveer halve sterkte' : ' at about half strength') : ''}`
      : (nl ? 'een evenwichtige meststof op halve sterkte' : 'a balanced fertilizer at half strength');
    tips.push({
      icon: '🌱',
      text: feeding
        ? (nl
          ? `Voed met ${feedWith} ongeveer elke ${effectiveFeedInterval(plant)} dagen zolang hij actief groeit.`
          : `Feed with ${feedWith} about every ${effectiveFeedInterval(plant)} days while it's actively growing.`)
        : (nl
          ? `Even geen mest nu — voeden begint weer in de lente als de groei op gang komt.`
          : `Hold off on fertilizer for now — feeding resumes in spring when growth picks back up.`),
    });
  }

  if (p.humidity && /high/i.test(p.humidity)) {
    tips.push({ icon: '💦', text: nl
      ? `Hij houdt van ${tl(p.humidity).toLowerCase()} luchtvochtigheid — zet 'm bij andere planten of gebruik een schaal met kiezels, vooral als de verwarming aan is.`
      : `It likes ${p.humidity.toLowerCase()} humidity — group it with other plants or use a pebble tray, especially with heating on.` });
  }

  if (p.toxic && /toxic/i.test(p.toxic) && !/non-toxic|pet safe/i.test(p.toxic)) {
    tips.push({ icon: '🐾', text: nl
      ? `Houd 'm buiten bereik van huisdieren en kleine kinderen — ${tl(p.toxic).toLowerCase()}.`
      : `Keep it out of reach of pets and small children — ${p.toxic.toLowerCase()}.` });
  }

  const tipText = s ? tl(s.tips) : p.tips;
  if (tipText) {
    tips.push({ icon: '💡', text: tipText });
  }

  return tips;
}

// How MUCH to water — the missing half of watering guidance. The schedule tells
// you when; this tells you the amount and method so people don't drown a plant
// with daily splashes (the #1 way houseplants die). Keyed by plant type, because
// "how much" is a property of the type: succulents want soak-and-dry, ferns want
// evenly moist, most tropicals want a thorough drench then a partial dry-down.
// Returns { label } — a short method tag for compact spots — and { text } — the
// full plain-language guidance. "Until it drains from the bottom" scales the
// volume to the pot on its own, which is why it beats naming a fixed amount.
const WATER_AMOUNT = {
  succulent: {
    en: {
      label: 'Soak & dry — never a daily splash',
      text: 'Give it a proper soak — water until it runs out the drainage holes, then don\'t water again until the soil is bone dry (often a week or two). A daily splash is what rots succulents; one big drink followed by a long dry spell is what they actually want.',
    },
    nl: {
      label: 'Doordrenken en laten opdrogen',
      text: 'Geef \'m een flinke plens — water tot het onderuit de pot loopt en geef daarna pas weer water als de aarde kurkdroog is (vaak pas na een week of twee). Een dagelijks scheutje laat vetplanten rotten; één grote slok en dan lang droog is precies wat ze willen.',
    },
  },
  fern: {
    en: {
      label: 'Keep evenly moist',
      text: 'Water little and often to keep the soil evenly moist — never let it dry out completely, but never leave it standing in water either. A thorough drink whenever the surface starts to feel dry is about right.',
    },
    nl: {
      label: 'Gelijkmatig vochtig houden',
      text: 'Geef kleine beetjes maar regelmatig, zodat de aarde gelijkmatig vochtig blijft — laat \'m nooit helemaal uitdrogen, maar laat \'m ook niet in het water staan. Een goede slok zodra de bovenkant droog begint te voelen is precies goed.',
    },
  },
  orchid: {
    en: {
      label: 'Soak the bark, then drain fully',
      text: 'Soak the bark thoroughly, then let every drop drain away — never leave water sitting in the pot or in the crown. It\'s a good drench and a full drain, not a daily trickle.',
    },
    nl: {
      label: 'Bast doorweken, dan laten uitlekken',
      text: 'Laat de bast goed doorweken en laat daarna elke druppel weglopen — laat nooit water in de pot of in het hart staan. Het is flink doorspoelen en volledig laten uitlekken, geen dagelijks straaltje.',
    },
  },
  herb: {
    en: {
      label: 'Keep moist — water generously',
      text: 'Herbs are thirsty — water generously whenever the surface starts to dry, until it drains from the bottom. Keep the soil consistently moist, but tip out any water left standing in the saucer.',
    },
    nl: {
      label: 'Vochtig houden — royaal water',
      text: 'Kruiden hebben dorst — geef royaal water zodra de bovenkant droog wordt, tot het onderuit de pot loopt. Houd de aarde gelijkmatig vochtig, maar giet water dat in de schotel blijft staan weg.',
    },
  },
  flowering: {
    en: {
      label: 'Soak the soil, drain, let the top dry',
      text: 'Water thoroughly until it drains from the bottom, aiming at the soil rather than the flowers or leaves. Let the top of the soil dry before the next drink and empty the saucer so the roots never sit in water.',
    },
    nl: {
      label: 'Aarde doordrenken, laten uitlekken',
      text: 'Water grondig tot het onderuit de pot loopt en richt op de aarde in plaats van op de bloemen of bladeren. Laat de bovenkant van de aarde uitdrogen voor de volgende beurt en giet de schotel leeg zodat de wortels nooit in water staan.',
    },
  },
  'tropical-foliage': {
    en: {
      label: 'Soak until it drains, then part-dry',
      text: 'Water thoroughly until it drains from the bottom, then let the top 2–3 cm dry before watering again. Empty the saucer so the roots never sit in water — a soak-then-dry beats frequent small splashes.',
    },
    nl: {
      label: 'Doordrenken, dan deels laten opdrogen',
      text: 'Water grondig tot het onderuit de pot loopt en laat daarna de bovenste 2–3 cm uitdrogen voor je opnieuw water geeft. Giet de schotel leeg zodat de wortels nooit in water staan — flink water en dan laten opdrogen werkt beter dan vaak kleine scheutjes.',
    },
  },
  other: {
    en: {
      label: 'Soak until it drains, then let the top dry',
      text: 'Water thoroughly until it just drains from the bottom, then let the top of the soil dry before the next drink. Tip out any water left standing in the saucer — sitting in water is the most common cause of root rot.',
    },
    nl: {
      label: 'Doordrenken, dan bovenkant laten opdrogen',
      text: 'Water grondig tot het net onderuit de pot loopt en laat daarna de bovenkant van de aarde uitdrogen voor de volgende beurt. Giet water dat in de schotel blijft staan weg — in water staan is de meest voorkomende oorzaak van wortelrot.',
    },
  },
};

// A pot with no drainage hole is the one case where the normal advice is not
// just imprecise but wrong: you can't "water until it drains" or "empty the
// saucer" when water has nowhere to go — it pools at the bottom and rots the
// roots. So when the plant is known to be in a no-drainage pot, this guidance
// overrides the type-based text with a safe measured-amount routine.
const WATER_NO_DRAINAGE = {
  en: {
    label: 'No drainage — add a little at a time, never let it pool',
    text: 'This pot has no drainage hole, so excess water can\'t escape — too much collects at the bottom and rots the roots. Add just a little at a time (roughly a third of the pot at most), let it soak in before adding more, and never leave water standing at the base. Tip the pot to the side to check, and move it to a pot with drainage when you can.',
  },
  nl: {
    label: 'Geen gaatje — beetje bij beetje, nooit laten staan',
    text: 'Deze pot heeft geen gat, dus overtollig water kan er niet uit — te veel blijft onderin staan en laat de wortels rotten. Geef steeds maar een beetje (hooguit ongeveer een derde van de pot), laat het intrekken voor je meer geeft en laat nooit water onderin staan. Kantel de pot om te checken, en zet \'m in een pot met een gat zodra dat kan.',
  },
};

export function wateringAmount(plant) {
  const nl = getLang() === 'nl';
  if (plant && plant.conditions && plant.conditions.drainage === 'no') {
    return WATER_NO_DRAINAGE[nl ? 'nl' : 'en'];
  }
  const cat = plantCategory(plant);
  const byLang = WATER_AMOUNT[cat] || WATER_AMOUNT.other;
  return byLang[nl ? 'nl' : 'en'];
}

// Flag a manually-entered schedule that's well outside the species' known-good
// range — a likely mistake — without ever forcing a change. Only applies when a
// species is known (custom plants have no reference to compare against).
// Threshold is deliberately lenient (2.5×) because real conditions vary a lot.
const OFF_RATIO = 2.5;

export function scheduleWarnings(profile, speciesId) {
  const s = speciesId ? getSpecies(speciesId) : null;
  if (!s) return [];
  const nl = getLang() === 'nl';
  const name = tl(s.name);
  const out = [];

  const w = Number(profile.water);
  if (w > 0 && s.water) {
    if (w <= s.water / OFF_RATIO) {
      out.push({
        field: 'water', recommended: s.water,
        message: nl
          ? `Je ${name} wil meestal ongeveer elke ${s.water} dagen water — elke ${w} is misschien te vaak, en te veel water geven is de meest voorkomende doodsoorzaak van kamerplanten.`
          : `Your ${s.name} usually prefers watering about every ${s.water} days — every ${w} may be too often, and overwatering is the most common way houseplants die.`,
      });
    } else if (w >= s.water * OFF_RATIO) {
      out.push({
        field: 'water', recommended: s.water,
        message: nl
          ? `Je ${name} houdt meestal van water ongeveer elke ${s.water} dagen — elke ${w} kan 'm te ver laten uitdrogen.`
          : `Your ${s.name} usually likes water about every ${s.water} days — every ${w} could let it dry out too much.`,
      });
    }
  }

  const f = Number(profile.fertilize);
  if (f > 0 && s.fertilize && f <= s.fertilize / OFF_RATIO) {
    out.push({
      field: 'fertilize', recommended: s.fertilize,
      message: nl
        ? `Elke ${f} dagen voeden is veel voor je ${name} (die wil meestal ongeveer elke ${s.fertilize}); te veel voeden kan de wortels verbranden.`
        : `Feeding every ${f} days is a lot for your ${s.name} (it usually wants about every ${s.fertilize}); over-feeding can burn the roots.`,
    });
  }

  return out;
}
