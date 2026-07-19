// species.js — Care database for common houseplants.
//
// Each entry describes how to care for a plant during the GROWING SEASON.
// Seasonal adjustments (dormancy in winter, etc.) are applied in season.js.
//
// Fields:
//   water        base days between waterings in the growing season
//   winterFactor multiply the watering interval by this in winter dormancy
//                (e.g. 2.0 => water half as often). >1 means "water less often".
//   fertilize    base days between feedings in the growing season (0 = rarely/never)
//   feedWinter   whether to keep fertilizing through winter (most plants: false)
//   light        preferred light level
//   humidity     preferred humidity
//   tempMin      minimum comfortable temperature (°C)
//   toxic        toxicity note (pets/children)
//   difficulty   'easy' | 'moderate' | 'hard'
//   soil         recommended soil mix
//   tips         short, high-signal care notes
//   category     used as a fallback when an exact species isn't listed

export const LIGHT = {
  low: 'Low / indirect',
  medium: 'Bright indirect',
  bright: 'Bright indirect – some direct',
  full: 'Full sun',
};

export const SPECIES = [
  {
    id: 'snake-plant',
    name: 'Snake Plant',
    latin: 'Dracaena trifasciata',
    aka: ['Sansevieria', "Mother-in-law's tongue"],
    category: 'succulent',
    water: 14, winterFactor: 2.0, fertilize: 60, feedWinter: false,
    light: 'medium', humidity: 'Any', tempMin: 10,
    toxic: 'Mildly toxic to pets', difficulty: 'easy',
    soil: 'Free-draining cactus/succulent mix',
    tips: 'Extremely drought tolerant — the #1 killer is overwatering. Let soil dry fully. Water even less in winter.',
  },
  {
    id: 'zz-plant',
    name: 'ZZ Plant',
    latin: 'Zamioculcas zamiifolia',
    aka: ['Zanzibar gem'],
    category: 'succulent',
    water: 14, winterFactor: 1.8, fertilize: 60, feedWinter: false,
    light: 'low', humidity: 'Any', tempMin: 12,
    toxic: 'Toxic if ingested', difficulty: 'easy',
    soil: 'Well-draining potting mix',
    tips: 'Stores water in rhizomes. Tolerates neglect and low light. Wrinkled stems = thirsty; yellow leaves = overwatered.',
  },
  {
    id: 'pothos',
    name: 'Pothos',
    latin: 'Epipremnum aureum',
    aka: ["Devil's ivy", 'Money plant'],
    category: 'tropical-foliage',
    water: 7, winterFactor: 1.6, fertilize: 30, feedWinter: false,
    light: 'medium', humidity: 'Average', tempMin: 12,
    toxic: 'Toxic to pets', difficulty: 'easy',
    soil: 'Standard well-draining potting mix',
    tips: 'Let the top 2–3 cm dry out. Drooping leaves bounce back fast after watering. Very forgiving beginner plant.',
  },
  {
    id: 'monstera',
    name: 'Monstera',
    latin: 'Monstera deliciosa',
    aka: ['Swiss cheese plant'],
    category: 'tropical-foliage',
    water: 7, winterFactor: 1.6, fertilize: 30, feedWinter: false,
    light: 'medium', humidity: 'High', tempMin: 15,
    toxic: 'Toxic to pets', difficulty: 'easy',
    soil: 'Chunky aroid mix (bark + perlite + coco)',
    tips: 'Water when top 3–5 cm are dry. Wants a moss pole to climb and produce fenestrations. Wipe leaves to keep pores clear.',
  },
  {
    id: 'fiddle-leaf-fig',
    name: 'Fiddle Leaf Fig',
    latin: 'Ficus lyrata',
    aka: [],
    category: 'tropical-foliage',
    water: 7, winterFactor: 1.5, fertilize: 30, feedWinter: false,
    light: 'bright', humidity: 'Average', tempMin: 15,
    toxic: 'Toxic to pets', difficulty: 'hard',
    soil: 'Well-draining, slightly rich mix',
    tips: 'Hates being moved and hates inconsistency. Keep a fixed spot with bright light. Brown spots = over/under-water swings.',
  },
  {
    id: 'peace-lily',
    name: 'Peace Lily',
    latin: 'Spathiphyllum',
    aka: [],
    category: 'tropical-foliage',
    water: 5, winterFactor: 1.4, fertilize: 45, feedWinter: false,
    light: 'low', humidity: 'High', tempMin: 15,
    toxic: 'Toxic to pets', difficulty: 'easy',
    soil: 'Moisture-retentive but draining mix',
    tips: 'Dramatic but honest — it droops when thirsty and perks up within hours of watering. Likes staying lightly moist.',
  },
  {
    id: 'spider-plant',
    name: 'Spider Plant',
    latin: 'Chlorophytum comosum',
    aka: [],
    category: 'tropical-foliage',
    water: 7, winterFactor: 1.5, fertilize: 30, feedWinter: false,
    light: 'medium', humidity: 'Average', tempMin: 10,
    toxic: 'Pet safe', difficulty: 'easy',
    soil: 'Standard potting mix',
    tips: 'Brown tips usually mean fluoride/chlorine in tap water or dry air — try filtered water. Produces babies you can pot up.',
  },
  {
    id: 'aloe-vera',
    name: 'Aloe Vera',
    latin: 'Aloe barbadensis',
    aka: [],
    category: 'succulent',
    water: 14, winterFactor: 2.2, fertilize: 60, feedWinter: false,
    light: 'bright', humidity: 'Low', tempMin: 10,
    toxic: 'Mildly toxic to pets', difficulty: 'easy',
    soil: 'Gritty cactus/succulent mix',
    tips: 'Soak fully, then let dry completely. Mushy, translucent leaves = overwatered. Wants lots of light.',
  },
  {
    id: 'succulent-generic',
    name: 'Succulent (assorted)',
    latin: 'Various',
    aka: ['Echeveria', 'Haworthia', 'Sedum'],
    category: 'succulent',
    water: 12, winterFactor: 2.2, fertilize: 60, feedWinter: false,
    light: 'bright', humidity: 'Low', tempMin: 8,
    toxic: 'Varies', difficulty: 'easy',
    soil: 'Gritty cactus/succulent mix',
    tips: 'Soak-and-dry: water thoroughly, then wait until bone dry. Stretching (etiolation) means it needs more light.',
  },
  {
    id: 'cactus',
    name: 'Cactus',
    latin: 'Cactaceae',
    aka: [],
    category: 'succulent',
    water: 18, winterFactor: 3.0, fertilize: 60, feedWinter: false,
    light: 'full', humidity: 'Low', tempMin: 5,
    toxic: 'Generally non-toxic (spines aside)', difficulty: 'easy',
    soil: 'Very gritty cactus mix',
    tips: 'In winter most cacti want a cool, nearly dry rest — this triggers spring flowering. Water sparingly.',
  },
  {
    id: 'orchid-phalaenopsis',
    name: 'Orchid (Moth)',
    latin: 'Phalaenopsis',
    aka: ['Moth orchid'],
    category: 'orchid',
    water: 7, winterFactor: 1.3, fertilize: 14, feedWinter: false,
    light: 'medium', humidity: 'High', tempMin: 15,
    toxic: 'Pet safe', difficulty: 'moderate',
    soil: 'Bark-based orchid mix (never regular soil)',
    tips: 'Water by soaking bark then draining fully — never let roots sit in water. Silvery roots = thirsty, green = fine.',
  },
  {
    id: 'fern-boston',
    name: 'Boston Fern',
    latin: 'Nephrolepis exaltata',
    aka: [],
    category: 'fern',
    water: 4, winterFactor: 1.3, fertilize: 30, feedWinter: false,
    light: 'medium', humidity: 'Very high', tempMin: 12,
    toxic: 'Pet safe', difficulty: 'moderate',
    soil: 'Moisture-retentive peaty mix',
    tips: 'Never let it dry out fully. Craves humidity — group with other plants or use a pebble tray. Crispy fronds = too dry.',
  },
  {
    id: 'calathea',
    name: 'Calathea / Prayer Plant',
    latin: 'Calathea / Maranta',
    aka: ['Prayer plant'],
    category: 'tropical-foliage',
    water: 5, winterFactor: 1.3, fertilize: 30, feedWinter: false,
    light: 'medium', humidity: 'Very high', tempMin: 16,
    toxic: 'Pet safe', difficulty: 'hard',
    soil: 'Light, moisture-retentive mix',
    tips: 'Fussy about water quality — use filtered or rainwater. Wants high humidity and evenly moist (not soggy) soil.',
  },
  {
    id: 'rubber-plant',
    name: 'Rubber Plant',
    latin: 'Ficus elastica',
    aka: [],
    category: 'tropical-foliage',
    water: 9, winterFactor: 1.6, fertilize: 30, feedWinter: false,
    light: 'bright', humidity: 'Average', tempMin: 13,
    toxic: 'Toxic to pets', difficulty: 'easy',
    soil: 'Well-draining potting mix',
    tips: 'Let the top few cm dry between waterings. Wipe the big leaves to keep them glossy and dust-free.',
  },
  {
    id: 'philodendron',
    name: 'Philodendron (heartleaf)',
    latin: 'Philodendron hederaceum',
    aka: [],
    category: 'tropical-foliage',
    water: 7, winterFactor: 1.6, fertilize: 30, feedWinter: false,
    light: 'medium', humidity: 'Average', tempMin: 13,
    toxic: 'Toxic to pets', difficulty: 'easy',
    soil: 'Chunky, well-draining aroid mix',
    tips: 'Very forgiving trailing plant. Let the top 2–3 cm dry. Yellow leaves usually mean overwatering.',
  },
  {
    id: 'english-ivy',
    name: 'English Ivy',
    latin: 'Hedera helix',
    aka: [],
    category: 'tropical-foliage',
    water: 6, winterFactor: 1.5, fertilize: 30, feedWinter: false,
    light: 'medium', humidity: 'Average', tempMin: 8,
    toxic: 'Toxic to pets', difficulty: 'moderate',
    soil: 'Standard potting mix',
    tips: 'Likes cooler rooms and moist (not wet) soil. Prone to spider mites in dry heat — mist and inspect regularly.',
  },
  {
    id: 'chinese-evergreen',
    name: 'Chinese Evergreen',
    latin: 'Aglaonema',
    aka: [],
    category: 'tropical-foliage',
    water: 9, winterFactor: 1.6, fertilize: 45, feedWinter: false,
    light: 'low', humidity: 'Average', tempMin: 15,
    toxic: 'Toxic to pets', difficulty: 'easy',
    soil: 'Well-draining potting mix',
    tips: 'Tolerates low light well. Let the top third of the soil dry. Sensitive to cold drafts.',
  },
  {
    id: 'dracaena',
    name: 'Dracaena',
    latin: 'Dracaena marginata',
    aka: ['Dragon tree'],
    category: 'tropical-foliage',
    water: 10, winterFactor: 1.6, fertilize: 45, feedWinter: false,
    light: 'medium', humidity: 'Average', tempMin: 13,
    toxic: 'Toxic to pets', difficulty: 'easy',
    soil: 'Well-draining potting mix',
    tips: 'Sensitive to fluoride — brown tips often mean tap water. Use filtered water and let soil dry halfway.',
  },
  {
    id: 'jade-plant',
    name: 'Jade Plant',
    latin: 'Crassula ovata',
    aka: ['Money tree (jade)'],
    category: 'succulent',
    water: 14, winterFactor: 2.2, fertilize: 60, feedWinter: false,
    light: 'bright', humidity: 'Low', tempMin: 10,
    toxic: 'Toxic to pets', difficulty: 'easy',
    soil: 'Gritty succulent mix',
    tips: 'Water only when leaves feel slightly soft. Wants plenty of light to stay compact. Overwatering causes leaf drop.',
  },
  {
    id: 'african-violet',
    name: 'African Violet',
    latin: 'Saintpaulia',
    aka: [],
    category: 'flowering',
    water: 6, winterFactor: 1.3, fertilize: 21, feedWinter: false,
    light: 'medium', humidity: 'Average', tempMin: 16,
    toxic: 'Pet safe', difficulty: 'moderate',
    soil: 'Light African violet mix',
    tips: 'Water from the bottom to avoid wetting the fuzzy leaves (causes spots). Keep evenly moist and warm.',
  },
  {
    id: 'begonia',
    name: 'Begonia',
    latin: 'Begonia',
    aka: [],
    category: 'flowering',
    water: 6, winterFactor: 1.5, fertilize: 21, feedWinter: false,
    light: 'medium', humidity: 'High', tempMin: 15,
    toxic: 'Toxic to pets', difficulty: 'moderate',
    soil: 'Light, airy, well-draining mix',
    tips: 'Prone to powdery mildew — water the soil, not the leaves, and keep air moving. Let the top cm dry.',
  },
  {
    id: 'anthurium',
    name: 'Anthurium',
    latin: 'Anthurium andraeanum',
    aka: ['Flamingo flower'],
    category: 'flowering',
    water: 7, winterFactor: 1.4, fertilize: 30, feedWinter: false,
    light: 'medium', humidity: 'High', tempMin: 16,
    toxic: 'Toxic to pets', difficulty: 'moderate',
    soil: 'Chunky, airy aroid mix',
    tips: 'Wants warmth, humidity and bright indirect light to keep blooming. Let the top few cm dry between waterings.',
  },
  {
    id: 'string-of-pearls',
    name: 'String of Pearls',
    latin: 'Curio rowleyanus',
    aka: [],
    category: 'succulent',
    water: 12, winterFactor: 2.0, fertilize: 45, feedWinter: false,
    light: 'bright', humidity: 'Low', tempMin: 10,
    toxic: 'Toxic to pets', difficulty: 'moderate',
    soil: 'Gritty succulent mix, shallow pot',
    tips: 'Shrivelled pearls = thirsty; mushy/bursting pearls = overwatered. Wants bright light and a shallow, well-draining pot.',
  },
  {
    id: 'herb-basil',
    name: 'Basil (herb)',
    latin: 'Ocimum basilicum',
    aka: [],
    category: 'herb',
    water: 2, winterFactor: 1.2, fertilize: 21, feedWinter: false,
    light: 'full', humidity: 'Average', tempMin: 12,
    toxic: 'Pet safe', difficulty: 'moderate',
    soil: 'Rich, moisture-retentive mix',
    tips: 'Thirsty and sun-hungry. Keep soil consistently moist and pinch off flower buds to keep leaves coming.',
  },
  {
    id: 'herb-generic',
    name: 'Herbs (assorted)',
    latin: 'Various',
    aka: ['Mint', 'Parsley', 'Cilantro'],
    category: 'herb',
    water: 3, winterFactor: 1.3, fertilize: 21, feedWinter: false,
    light: 'full', humidity: 'Average', tempMin: 10,
    toxic: 'Mostly pet safe', difficulty: 'moderate',
    soil: 'Rich, well-draining mix',
    tips: 'Most kitchen herbs want lots of light and steady moisture. Harvest regularly to encourage bushy growth.',
  },
  {
    id: 'tropical-generic',
    name: 'Tropical foliage (other)',
    latin: 'Various',
    aka: [],
    category: 'tropical-foliage',
    water: 7, winterFactor: 1.6, fertilize: 30, feedWinter: false,
    light: 'medium', humidity: 'Average', tempMin: 13,
    toxic: 'Varies', difficulty: 'moderate',
    soil: 'Well-draining potting mix',
    tips: 'A safe general routine for leafy tropicals: let the top 2–3 cm dry, feed monthly in spring/summer, pause in winter.',
  },
];

// Fallback profile if nothing matches (used for fully custom plants).
export const DEFAULT_PROFILE = {
  water: 7, winterFactor: 1.5, fertilize: 30, feedWinter: false,
  light: 'medium', humidity: 'Average', tempMin: 13,
  toxic: 'Unknown', difficulty: 'moderate',
  soil: 'Well-draining potting mix',
  category: 'other',
  tips: 'No species preset — using a general routine. Adjust the watering interval to match how fast this plant dries out.',
};

const BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

// User-saved species (looked up via AI). Loaded from the DB at boot and kept in
// memory so lookups stay synchronous alongside the built-in library.
let CUSTOM = [];
let customById = {};

export function registerCustomSpecies(list) {
  CUSTOM = Array.isArray(list) ? list.slice() : [];
  customById = Object.fromEntries(CUSTOM.map((s) => [s.id, s]));
}

export function isCustomSpecies(id) {
  return Object.prototype.hasOwnProperty.call(customById, id);
}

// Built-in + user-saved species, for pickers and the care guide.
export function allSpecies() {
  return SPECIES.concat(CUSTOM);
}

export function getSpecies(id) {
  return BY_ID[id] || customById[id] || null;
}

// Build the editable care profile stored on a plant from a species id.
export function profileFromSpecies(id) {
  const s = getSpecies(id);
  const base = s || DEFAULT_PROFILE;
  return {
    water: base.water,
    winterFactor: base.winterFactor,
    fertilize: base.fertilize,
    feedWinter: base.feedWinter,
    light: base.light,
    humidity: base.humidity,
    tempMin: base.tempMin,
    toxic: base.toxic,
    difficulty: base.difficulty,
    soil: base.soil,
    category: base.category || 'other',
    tips: base.tips,
  };
}
