// diagnostics.js — Symptom troubleshooter.
//
// Each symptom lists the common causes (roughly most→least likely) with the
// tell-tale signs and what to do. This is deliberately conservative: the most
// common cause of houseplant death is overwatering, so causes are ordered to
// nudge people away from "water more" as a reflex.

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
      },
      {
        name: 'Underwatering',
        signs: 'Soil pulled away from the pot, bone dry, leaves crispy as well as yellow.',
        fix: 'Give a thorough soak and consider a shorter watering interval.',
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
      },
      {
        name: 'Tap-water minerals (fluoride/chlorine)',
        signs: 'Brown tips on sensitive plants (dracaena, spider plant, calathea).',
        fix: 'Switch to filtered, distilled, or rainwater. Flush the soil occasionally to wash out salts.',
      },
      {
        name: 'Inconsistent watering',
        signs: 'Tips and edges brown after the plant dried out too far between waterings.',
        fix: 'Water more evenly — don’t let it swing between soaking wet and bone dry.',
      },
      {
        name: 'Over-fertilizing',
        signs: 'Brown, burnt-looking tips, white crust on soil surface.',
        fix: 'Stop feeding, flush the pot with plenty of plain water, and dilute future feeds.',
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
      },
      {
        name: 'Overwatered / root rot',
        signs: 'Soil soggy, leaves limp and possibly yellow/soft; does NOT recover after watering.',
        fix: 'Hold off watering, let it dry, and check roots — trim any black, mushy roots and repot in fresh, dry mix.',
      },
      {
        name: 'Temperature shock / draft',
        signs: 'Sudden droop after a cold draft, an open window, or being moved.',
        fix: 'Move to a stable spot away from drafts, AC, and heat sources.',
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
      },
      {
        name: 'Fungus gnats',
        signs: 'Small black flies around the soil; larvae in constantly-moist topsoil.',
        fix: 'Let the top of the soil dry out, use sticky traps, and bottom-water for a while. Usually a sign of overwatering.',
      },
      {
        name: 'Mealybugs / scale',
        signs: 'White cottony fuzz or brown bumps in leaf joints; sticky residue.',
        fix: 'Dab with a cotton bud dipped in rubbing alcohol, then treat with neem oil. Isolate from other plants.',
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
      },
      {
        name: 'Mineral / fertilizer salt crust',
        signs: 'Crunchy white/yellow crust on the soil or pot rim.',
        fix: 'Flush the pot with plenty of plain water to leach out salts; ease off fertilizer.',
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
      },
      {
        name: 'Root-bound / hungry',
        signs: 'Roots circling out of the drainage holes, water runs straight through.',
        fix: 'Repot one size up in spring and resume feeding in the growing season.',
      },
    ],
  },
];

export function getSymptom(id) {
  return SYMPTOMS.find((s) => s.id === id) || null;
}
