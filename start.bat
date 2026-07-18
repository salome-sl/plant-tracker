@echo off
REM ===============================================================
REM  Plant Care Tracker - local launcher (Windows)
REM  Serves the app on http://localhost:8137 and opens your browser.
REM  Keep this window open while you use the app; close it to stop.
REM ===============================================================
cd /d "%~dp0"

set PORT=8137

echo Starting Plant Care Tracker on http://localhost:%PORT% ...
start "" "http://localhost:%PORT%/index.html"

REM Try the Python launcher first, then plain python.
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server %PORT% --bind 127.0.0.1
) else (
  python -m http.server %PORT% --bind 127.0.0.1
)
