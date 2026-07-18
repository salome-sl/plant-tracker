#!/usr/bin/env python3
"""Bump the app version before a deploy.

Increments APP_VERSION in js/app.js (semantic version) AND the CACHE version in
sw.js (plant-tracker-vN). Bumping the service-worker cache is what makes browsers
notice a new release and show the in-app "new version ready" prompt.

Usage:
    python bump.py            # patch bump: 1.3.0 -> 1.3.1  (and sw v10 -> v11)
    python bump.py minor      # 1.3.0 -> 1.4.0
    python bump.py major      # 1.3.0 -> 2.0.0
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP = ROOT / "js" / "app.js"
SW = ROOT / "sw.js"

APP_RE = re.compile(r"(const APP_VERSION = ')(\d+)\.(\d+)\.(\d+)(';)")
SW_RE = re.compile(r"(const CACHE = 'plant-tracker-v)(\d+)(';)")


def bump_app(text, part):
    m = APP_RE.search(text)
    if not m:
        raise SystemExit("Could not find APP_VERSION in js/app.js")
    major, minor, patch = int(m.group(2)), int(m.group(3)), int(m.group(4))
    if part == "major":
        major, minor, patch = major + 1, 0, 0
    elif part == "minor":
        minor, patch = minor + 1, 0
    else:
        patch += 1
    new = f"{major}.{minor}.{patch}"
    return APP_RE.sub(rf"\g<1>{new}\g<5>", text, count=1), new


def bump_sw(text):
    m = SW_RE.search(text)
    if not m:
        raise SystemExit("Could not find CACHE version in sw.js")
    n = int(m.group(2)) + 1
    return SW_RE.sub(rf"\g<1>{n}\g<3>", text, count=1), f"v{n}"


def main():
    part = sys.argv[1] if len(sys.argv) > 1 else "patch"
    if part not in ("patch", "minor", "major"):
        raise SystemExit("Argument must be one of: patch, minor, major")

    app_text = APP.read_text(encoding="utf-8")
    sw_text = SW.read_text(encoding="utf-8")

    app_text, app_ver = bump_app(app_text, part)
    sw_text, sw_ver = bump_sw(sw_text)

    APP.write_text(app_text, encoding="utf-8")
    SW.write_text(sw_text, encoding="utf-8")

    print(f"App version -> {app_ver}")
    print(f"SW cache    -> plant-tracker-{sw_ver}")
    print("\nNow deploy, e.g.:")
    print('  git commit -am "release {}" && git push'.format(app_ver))


if __name__ == "__main__":
    main()
