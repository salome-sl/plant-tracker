# 🌿 Plant Care Tracker

A local-first, installable web app (PWA) for keeping your houseplants alive: it
tracks watering and feeding schedules, adjusts them by **season**, logs each
plant's **health and photo progression**, and includes a **care guide** and
**symptom troubleshooter**.

Everything is stored **privately in your browser** — no accounts, no server, no
data leaves your device. It works fully **offline** once loaded.

---

## Running it

The app must be served over HTTP (a PWA can't run by double-clicking
`index.html` — browsers block modules and the service worker on `file://`).

### Easiest (Windows)
Double-click **`start.bat`**. It serves the app on `http://localhost:8137` and
opens your browser. Keep the little black window open while you use it; close it
to stop. (Requires Python, which you already have.)

### Manual
From this folder, run any static server, e.g.:

```
python -m http.server 8137
```

then open <http://localhost:8137/index.html>.

---

## Install it on your phone (PWA)

A phone can only install this as a real offline app if it's served over **HTTPS**
(browsers block the service worker on a plain `http://` LAN address). The easiest
way is to put the folder on a free static host:

**Recommended — Netlify Drop (no account, ~1 minute):**
1. On your computer, go to **app.netlify.com/drop**.
2. Drag this whole `Plant Tracker` folder onto the page. You get an `https://…netlify.app` URL.
3. Open that URL on your phone:
   - **iPhone (Safari):** Share button → **Add to Home Screen**.
   - **Android (Chrome):** ⋮ menu → **Install app** / **Add to Home Screen**.

It then launches full-screen, works offline, and keeps working even when your PC
is off. GitHub Pages and Cloudflare Pages work the same way.

**Quick same-Wi‑Fi test (no install, no offline):** run `start.bat` but change the
bind so your phone can reach it (`python -m http.server 8137 --bind 0.0.0.0`), find
your PC's IP with `ipconfig`, and browse to `http://<your-pc-ip>:8137` on your phone.
This is fine for a look, but it needs the PC running and won't install as a full
offline app (that needs HTTPS).

**Your plants live on each device.** Data is stored in that device's browser, not
in the cloud — so your phone starts empty. To move plants from your PC to your
phone, use **Settings → Export backup** on the PC and **Import backup** on the phone.

---

## Features

- **Today dashboard** — what needs water/feeding now, overdue alerts, health summary.
- **Seasonal awareness** — watering intervals automatically stretch in autumn/winter
  (dormancy) and tighten in summer; feeding pauses out of season. Set your
  hemisphere in Settings.
- **Pot & spot personalization** — tell it each plant's pot size, material
  (terracotta dries faster than plastic), drainage, and the actual light in its
  spot, and the watering frequency adjusts accordingly — like Planta, but on-device.
- **Growth tracking** — log height (and leaf count) over time and see a little
  chart of the trend alongside the photo progression.
- **Per-plant schedules** — watering + fertilizing, prefilled from a library of
  common houseplants, fully editable.
- **Backdate & fix logs** — forgot to log on the day? Use the **📅** button on a
  schedule card to log watering/feeding for a past date, or tap any date in the
  Care history to edit it. The next‑due date recalculates from the real date so
  the schedule stays accurate. Adding a plant you've had a while? Set **"Last
  watered"** so its schedule is correct from day one.
- **Health log & photos** — record condition (thriving / so‑so / struggling),
  notes, and dated photos to watch each plant progress over time.
- **Progress-photo reminders** — after ~30 days without a photo, the plant (and
  the Today dashboard) prompt you for a fresh health photo, with a **one-tap
  camera button** that opens straight to the camera and saves it to the log.
- **Add any plant** — not just the built-in species. Pick "Custom / not listed",
  type the species, and **✨ Look up care info** fetches its full care profile
  (watering, feeding, light, humidity, soil, toxicity, tips) via AI and fills the
  form for you. Looked-up species are **saved to your library** — they appear in
  the species dropdown and the Care Guide (tagged "Saved") for reuse, and are
  included in your backups. Remove one from its Care Guide page. If the app
  identifies a plant it doesn't have, it says so and offers to fetch the care
  info **either via the API or by pasting a prompt into your own Claude/ChatGPT**
  (no key) — then adds it to your library. **Identifying** a plant from a photo
  also offers both paths: the API, or **📋 Identify with your own AI** — copy the
  prompt + photo into Claude/ChatGPT and paste its answer back. Any photo you add
  (often the ID photo) becomes the plant's **starting photo** (dated today) in the
  progression automatically.
- **Care guide** — light, water, humidity, temperature, soil, toxicity and tips
  for each species.
- **Troubleshoot** — pick a symptom (yellow leaves, brown tips, drooping, pests…)
  for likely causes, ordered most‑common‑first, and what to do.
- **Care coach** — a warm, plain‑language "great choice, here's how to keep it
  thriving" write‑up for every plant, generated on‑device from its species and
  the current season.
- **Schedule safeguard** — if you enter a watering/feeding interval that's well
  outside a plant's known‑good range (e.g. watering a cactus every 3 days), the
  form shows a gentle warning with a one‑tap "use recommended". It only warns —
  it never overrides your choice.
- **✨ AI health check** — show Claude a photo and get a genuine, conversational
  read on the plant's condition plus next steps. Add **background context** ("just
  repotted", "moved to a darker room", "leaves browning since last week") so the
  assessment accounts for it, and tap **Analyze again** to refine. If it spots
  over/under-watering it offers a **one-tap "Apply changes"** that updates the
  plant's schedule. Save the read to the health log too. Optional; see *AI health
  checks* below.
- **💬 Continue in your own AI (free)** — instead of paying per API call for a
  back‑and‑forth, copy an all‑encompassing **hand‑off** (the plant's full profile,
  history, and the app's assessment) and paste it into your own Claude or ChatGPT
  to keep troubleshooting on your existing subscription. A **Copy photo** button
  puts the plant's picture on your clipboard too, so your AI can see it. The
  hand‑off instructs that AI to end with a structured `plant-tracker` block. When
  you're done chatting, a **Copy summary prompt** button gives you a closing prompt
  to send your AI so it outputs a clean, importable block — paste that back and the
  app **imports the findings** (updating the schedule and saving a health note).
  Parsing is done entirely on‑device (no extra API call), and every import is shown
  as a preview you approve before anything changes.
- **Reminders** — optional browser notifications while the app is open/reopened.
- **Backup** — export/import your whole database as a JSON file.

---

## Keeping it updated

The smoothest workflow is to host from a **GitHub repo** with push‑to‑deploy, so
an update is just `git push` (or editing files on github.com) — the same URL
rebuilds automatically, no re‑uploading folders.

- **GitHub Pages:** push the repo, then repo **Settings → Pages → Deploy from
  branch**. You get a stable `https://<you>.github.io/<repo>/` URL.
- **Netlify / Cloudflare Pages:** connect the GitHub repo once; every push
  auto‑deploys. (You can also keep drag‑and‑drop, but then you re‑upload each time.)

**Redeploying — the exact steps:**

```
python bump.py            # 1. bump the version (patch); use "minor" / "major" to jump more
git commit -am "release"  # 2. commit
git push                  # 3. push — GitHub Pages / Netlify rebuilds at the same URL
```

If you're on drag‑and‑drop instead of Git: run `python bump.py`, then re‑drag the
folder to your host. (Connecting a Git repo is what makes step 3 a one‑liner.)

**Why the bump matters:** `bump.py` increments both `APP_VERSION` in `js/app.js`
and the `CACHE` version in `sw.js`. The service‑worker version change is what
makes browsers notice a new release — skip it and users keep the old cached
version. The script keeps the two in sync so you can't forget.

**Reminders without a server:** the app always shows a "what needs care today"
summary when opened/reopened. On an **installed Android (Chromium) app** it also
uses the **Periodic Background Sync** API to wake ~once a day and notify you even
when closed — no cloud needed (the app writes a small "what's due" digest to
IndexedDB that the service worker reads). iPhone/Safari don't allow background
reminders without a push server, so there it stays open/reopen only.

**How users get the update:** the installed app checks for a new version when
it's reopened/focused (and hourly). When one is found it shows a **"🌱 A new
version is ready — Update"** banner; one tap reloads into the new version and
clears the old cache. Until they tap it, they keep running the current version
happily offline. The current version is shown in **Settings**.

---

## AI health checks (optional)

The AI health check is the only feature that uses the internet. It sends the
photo you choose to Anthropic's vision model (Claude) and returns a natural,
expert assessment.

To enable it:

1. Get an Anthropic API key at **console.anthropic.com** (you pay Anthropic
   directly, per use — a photo analysis costs roughly a cent or two).
2. Open **Settings → AI health checks**, paste the key, and pick a model
   (Opus = best, Haiku = cheapest).
3. On any plant, tap **✨ AI health check**, choose a photo, and analyze.

Your key is stored **only in this browser**, and the photo is sent to Anthropic
**only when you run a check**. Everything else in the app stays on your device
and works fully offline.

---

## How the seasonal watering works

Each plant has a **growing‑season interval** (e.g. Snake Plant = 14 days) and a
**winter factor** (how strongly it goes dormant). The app multiplies the base
interval by a seasonal factor:

| Season | Factor | Snake Plant (base 14d) |
|--------|--------|------------------------|
| Summer | ~0.9 (dries faster) | ~13 days |
| Spring | 1.0 | 14 days |
| Autumn | halfway to dormancy | ~21 days |
| Winter | the plant's winter factor (2.0) | ~28 days |

Feeding is paused in autumn/winter for most plants. This is the single biggest
lever against the most common way houseplants die: **overwatering during
dormancy.**

---

## Project layout

```
index.html              app shell + bottom navigation
manifest.webmanifest    PWA manifest (installability)
sw.js                   service worker (offline cache)
start.bat               one-click local launcher (Windows)
css/styles.css          styles (light/dark, mobile-first)
icons/                  app icons (svg + generated pngs)
js/
  app.js                router + all views/UI
  db.js                 IndexedDB storage + backup/restore
  species.js            houseplant care database
  season.js             hemisphere/season + seasonal adjustments
  schedule.js           due-date + status computation
  diagnostics.js        symptom troubleshooter content
  coach.js              on-device natural-language care coaching
  ai.js                 AI photo health analysis (Claude vision)
  settings.js           preferences (localStorage)
  util.js               DOM, date, and photo helpers
```

Your data never leaves the browser. **Export a backup regularly** — clearing
browser data (or "clear site data") will erase your plants.
