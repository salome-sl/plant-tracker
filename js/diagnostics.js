// diagnostics.js — Symptom troubleshooter, tailored per plant.
//
// Each symptom lists the common causes (roughly most→least likely) with the
// tell-tale signs and what to do. This is deliberately conservative: the most
// common cause of houseplant death is overwatering, so causes are ordered to
// nudge people away from "water more" as a reflex.
//
// Tailoring: every cause can carry `boost` / `mute` category lists. When the
// user picks a specific plant we re-rank the causes for that plant's category —
// e.g. "low humidity" jumps to the top for a fern but drops to the bottom for a
// succulent — and we surface the category's biggest risk up front. This scales
// to any custom/AI-added species automatically, since they all carry a category.

export const SYMPTOMS = [
  {
    id: 'yellow-leaves',
    title: 'Yellowing leaves',
    emoji: '🟡',
    causes: [
      {
        name: 'Overwatering (most common)',
        signs: 'Several leaves yellow at once, soil stays wet, possible musty smell, mushy stems.',
        fix: 'Stop watering. Let the soil dry out well before the next drink. Check that the pot drains and empty any saucer. If the smell is bad, unpot and inspect roots for rot.',
        boost: ['succulent', 'cactus', 'orchid'],
      },
      {
        name: 'Natural aging',
        signs: 'Only the oldest, lowest leaves yellow, one at a time.',
        fix: 'Normal — just remove the spent leaves. No change needed.',
      },
      {
        name: 'Nutrient deficiency',
        signs: 'Newer leaves pale/yellow, sometimes with green veins; plant not fed in months.',
        fix: 'Resume a balanced fertilizer at half strength during the growing season.',
        boost: ['herb', 'flowering'],
        mute: ['succulent', 'cactus'],
      },
      {
        name: 'Underwatering',
        signs: 'Soil pulled away from the pot, bone dry, leaves crispy as well as yellow.',
        fix: 'Give a thorough soak and consider a shorter watering interval.',
        boost: ['fern', 'herb'],
        mute: ['succulent', 'cactus'],
      },
    ],
  },
  {
    id: 'brown-tips',
    title: 'Brown leaf tips / edges',
    emoji: '🟤',
    causes: [
      {
        name: 'Low humidity',
        signs: 'Crispy brown tips, worst in winter with heating on. Common on ferns, calatheas, spider plants.',
        fix: 'Raise humidity: group plants, use a pebble tray or humidifier. Keep away from radiators and vents.',
        boost: ['fern', 'orchid', 'tropical-foliage'],
        mute: ['succulent', 'cactus'],
      },
      {
        name: 'Tap-water minerals (fluoride/chlorine)',
        signs: 'Brown tips on sensitive plants (dracaena, spider plant, calathea).',
        fix: 'Switch to filtered, distilled, or rainwater. Flush the soil occasionally to wash out salts.',
        boost: ['fern', 'tropical-foliage', 'orchid'],
        mute: ['succulent', 'cactus', 'herb'],
      },
      {
        name: 'Inconsistent watering',
        signs: 'Tips and edges brown after the plant dried out too far between waterings.',
        fix: 'Water more evenly — don’t let it swing between soaking wet and bone dry.',
        boost: ['herb', 'fern'],
      },
      {
        name: 'Over-fertilizing',
        signs: 'Brown, burnt-looking tips, white crust on soil surface.',
        fix: 'Stop feeding, flush the pot with plenty of plain water, and dilute future feeds.',
        boost: ['herb', 'flowering'],
      },
    ],
  },
  {
    id: 'drooping',
    title: 'Drooping / wilting',
    emoji: '🥀',
    causes: [
      {
        name: 'Thirsty',
        signs: 'Soil dry, leaves limp but still green; perks up within hours of watering.',
        fix: 'Water thoroughly. If it recovers fast, just shorten the interval slightly.',
        boost: ['fern', 'herb', 'flowering'],
        mute: ['succulent', 'cactus'],
      },
      {
        name: 'Overwatered / root rot',
        signs: 'Soil soggy, leaves limp and possibly yellow/soft; does NOT recover after watering.',
        fix: 'Hold off watering, let it dry, and check roots — trim any black, mushy roots and repot in fresh, dry mix.',
        boost: ['succulent', 'cactus', 'orchid'],
      },
      {
        name: 'Temperature shock / draft',
        signs: 'Sudden droop after a cold draft, an open window, or being moved.',
        fix: 'Move to a stable spot away from drafts, AC, and heat sources.',
        boost: ['tropical-foliage', 'flowering'],
      },
    ],
  },
  {
    id: 'leaf-drop',
    title: 'Dropping leaves',
    emoji: '🍃',
    causes: [
      {
        name: 'Environmental change / shock',
        signs: 'Leaf drop soon after buying, moving, or repotting the plant. Common in figs (ficus).',
        fix: 'Give it a stable spot and consistent care; some drop is normal while it acclimates. Don’t overwater to compensate.',
        boost: ['tropical-foliage', 'flowering'],
      },
      {
        name: 'Watering extremes',
        signs: 'Both over- and under-watering can trigger drop; check the soil to tell which.',
        fix: 'Correct toward even moisture appropriate for the species.',
      },
      {
        name: 'Too little light',
        signs: 'Leggy, stretched growth and lower leaves dropping.',
        fix: 'Move to brighter (indirect) light or add a grow light.',
        boost: ['flowering', 'herb'],
      },
    ],
  },
  {
    id: 'pests',
    title: 'Pests (bugs on the plant)',
    emoji: '🐛',
    causes: [
      {
        name: 'Spider mites',
        signs: 'Fine webbing, tiny specks, stippled/pale leaves. Thrive in dry air.',
        fix: 'Rinse the plant, raise humidity, and treat with insecticidal soap or neem oil weekly until clear. Isolate it.',
        boost: ['tropical-foliage', 'fern', 'flowering'],
      },
      {
        name: 'Fungus gnats',
        signs: 'Small black flies around the soil; larvae in constantly-moist topsoil.',
        fix: 'Let the top of the soil dry out, use sticky traps, and bottom-water for a while. Usually a sign of overwatering.',
        boost: ['tropical-foliage', 'fern'],
        mute: ['succulent', 'cactus'],
      },
      {
        name: 'Mealybugs / scale',
        signs: 'White cottony fuzz or brown bumps in leaf joints; sticky residue.',
        fix: 'Dab with a cotton bud dipped in rubbing alcohol, then treat with neem oil. Isolate from other plants.',
        boost: ['succulent', 'cactus', 'orchid'],
      },
    ],
  },
  {
    id: 'soil-mold',
    title: 'White mold / crust on soil',
    emoji: '⚪',
    causes: [
      {
        name: 'Harmless surface mold',
        signs: 'Fuzzy white patch on damp topsoil, often with low airflow.',
        fix: 'Scrape it off, let the soil dry more between waterings, and improve air circulation.',
        boost: ['tropical-foliage', 'fern'],
        mute: ['succulent', 'cactus'],
      },
      {
        name: 'Mineral / fertilizer salt crust',
        signs: 'Crunchy white/yellow crust on the soil or pot rim.',
        fix: 'Flush the pot with plenty of plain water to leach out salts; ease off fertilizer.',
        boost: ['herb', 'flowering'],
      },
    ],
  },
  {
    id: 'no-growth',
    title: 'Not growing',
    emoji: '⏸️',
    causes: [
      {
        name: 'Winter dormancy',
        signs: 'Growth stalls in autumn/winter — completely normal.',
        fix: 'Nothing to fix. Water less, don’t feed, and wait for spring.',
      },
      {
        name: 'Not enough light',
        signs: 'No new leaves, pale or stretched growth even in the growing season.',
        fix: 'Move to brighter indirect light.',
        boost: ['flowering', 'herb'],
      },
      {
        name: 'Root-bound / hungry',
        signs: 'Roots circling out of the drainage holes, water runs straight through.',
        fix: 'Repot one size up in spring and resume feeding in the growing season.',
        boost: ['herb', 'flowering'],
        mute: ['succulent', 'cactus'],
      },
    ],
  },
];

// A friendly noun for a plant category (used in tailored copy).
export const CATEGORY_NOUN = {
  succulent: 'succulent',
  cactus: 'cactus',
  'tropical-foliage': 'tropical foliage plant',
  fern: 'fern',
  flowering: 'flowering plant',
  herb: 'herb',
  orchid: 'orchid',
};

// The single biggest thing to know when diagnosing this kind of plant.
export const CATEGORY_LEAD = {
  succulent: 'Overwatering is by far the biggest risk — when in doubt, wait longer between waterings and make sure the soil is dry first.',
  cactus: 'Overwatering is the biggest risk — these want to dry out completely between drinks.',
  'tropical-foliage': 'Most tropical foliage wants steady (not soggy) moisture, warmth, and bright indirect light — sudden changes are a common trigger.',
  fern: 'Ferns are thirsty and love humidity — most trouble traces back to the soil drying out or the air being too dry.',
  orchid: 'Orchids resent soggy roots — root rot from overwatering is the usual culprit, and they like humidity and airflow.',
  herb: 'Herbs grow fast and drink, feed, and sun-bathe heavily — they wilt quickly but usually bounce back once the cause is fixed.',
  flowering: 'Flowering plants are hungry and light-hungry; stress tends to show up quickly in the leaves and buds.',
};

export function getSymptom(id) {
  return SYMPTOMS.find((s) => s.id === id) || null;
}

// Re-rank a symptom's causes for a specific plant category: causes the category
// makes MORE likely rise to the top (relevance 'high'), ones it makes unlikely
// sink to the bottom (relevance 'low'), everything else stays in place. Original
// order is preserved within each band. A null/unknown category returns the
// causes unchanged (all 'normal').
const RANK = { high: 0, normal: 1, low: 2 };

export function tailorCauses(symptom, category) {
  return symptom.causes
    .map((c, i) => {
      let relevance = 'normal';
      if (category && c.boost && c.boost.includes(category)) relevance = 'high';
      else if (category && c.mute && c.mute.includes(category)) relevance = 'low';
      return { ...c, relevance, _order: i };
    })
    .sort((a, b) => (RANK[a.relevance] - RANK[b.relevance]) || (a._order - b._order));
}
