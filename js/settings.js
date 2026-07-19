// settings.js — App preferences, stored in localStorage.

const KEY = 'plant-tracker-settings';

const DEFAULTS = {
  hemisphere: 'N',        // 'N' | 'S'
  notifications: false,   // browser notifications opt-in
  notifyHour: 9,          // hour of day for the daily reminder check
  theme: 'auto',          // 'auto' | 'light' | 'dark'
  apiKey: '',             // Anthropic API key for AI health checks (stored on-device)
  aiModel: 'claude-opus-4-8',
  feed: null,             // the fertilizer you use on all plants: { name, npk, minDays, maxDays, dilute }
  lang: 'en',             // 'en' | 'nl'
  units: 'metric',        // 'metric' (cm, °C) | 'imperial' (in, °F)
};

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
