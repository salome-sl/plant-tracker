// season.js — Seasonal awareness.
//
// The single most important factor in keeping houseplants alive is watering
// them LESS in winter. Most plants slow or stop growing (dormancy) when days
// are short and cool, so their roots use far less water. Watering on a summer
// schedule through winter is the classic way to rot a plant.
//
// This module turns "today's date + hemisphere" into a season, and provides
// the multiplier that stretches (or tightens) a plant's base watering interval.

export const SEASONS = ['winter', 'spring', 'summer', 'autumn'];

export const SEASON_META = {
  spring: { label: 'Spring', emoji: '🌱', note: 'Growth resumes — resume normal watering and start feeding again.' },
  summer: { label: 'Summer', emoji: '☀️', note: 'Peak growth and heat — plants dry out fastest and need the most water.' },
  autumn: { label: 'Autumn', emoji: '🍂', note: 'Growth slows — begin easing off water and stop feeding most plants.' },
  winter: { label: 'Winter', emoji: '❄️', note: 'Dormancy — water sparingly and hold off on fertilizer for most plants.' },
};

// Month (0–11) -> season, per hemisphere.
export function seasonForDate(date, hemisphere = 'N') {
  const m = date.getMonth();
  // Northern hemisphere meteorological seasons.
  let s;
  if (m === 11 || m === 0 || m === 1) s = 'winter';
  else if (m >= 2 && m <= 4) s = 'spring';
  else if (m >= 5 && m <= 7) s = 'summer';
  else s = 'autumn';

  if (hemisphere === 'S') {
    // Southern hemisphere is offset by six months.
    s = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' }[s];
  }
  return s;
}

// How much to stretch the base (growing-season) watering interval, given the
// current season and how strongly this plant goes dormant (winterFactor).
//
// winterFactor is the FULL-winter multiplier for a species (e.g. cactus 3.0,
// tropical 1.6). We interpolate the other seasons off that so the schedule
// eases in and out of dormancy instead of jumping.
export function wateringMultiplier(season, winterFactor = 1.5) {
  switch (season) {
    case 'summer':
      return 0.9; // hotter + active growth -> dries out a touch faster
    case 'spring':
      return 1.0; // baseline growing season
    case 'autumn':
      // halfway between growing season and full dormancy
      return 1 + (winterFactor - 1) * 0.5;
    case 'winter':
      return winterFactor;
    default:
      return 1.0;
  }
}

// Whether feeding should happen at all right now. Most plants should not be
// fertilized in winter (no growth to support -> salt buildup / root burn).
export function shouldFeed(season, feedWinter = false) {
  if (season === 'winter') return !!feedWinter;
  if (season === 'autumn') return !!feedWinter; // taper off in autumn too
  return true; // spring & summer
}

// A short, plain-language explanation of the current seasonal adjustment for a
// given plant, shown in the UI so the schedule never feels like a black box.
export function seasonalExplanation(season, profile) {
  const mult = wateringMultiplier(season, profile.winterFactor);
  const feeding = shouldFeed(season, profile.feedWinter);
  const parts = [];
  if (mult > 1.05) {
    parts.push(`watering stretched ${Math.round((mult - 1) * 100)}% for ${season} dormancy`);
  } else if (mult < 0.95) {
    parts.push(`watering ${Math.round((1 - mult) * 100)}% more frequent for summer heat`);
  } else {
    parts.push('watering at the normal growing-season pace');
  }
  parts.push(feeding ? 'feeding active' : 'feeding paused for the season');
  return parts.join(' · ');
}
