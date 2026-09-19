---
title: F1 Predictor 2026 — Race Intelligence Platform
emoji: 🏎️
colorFrom: red
colorTo: navy
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: ML-powered F1 race predictor — live Jolpica/OpenF1/FastF1 + HF datasets, Monte Carlo + XGBoost ensemble, Flask dashboard
tags:
  - formula1
  - f1
  - sports-analytics
  - machine-learning
  - flask
  - huggingface
---

# F1 Predictor 2026 — Race Intelligence Platform

> **Live on Hugging Face Spaces** — Docker SDK `python:3.11-slim`, non-root `user:1000`, `gunicorn` `1×4` `gthread` on `0.0.0.0:7860`, persistent `/data` auto-migrated. **No dummy data** — calendar/standings/lineup synced to Jolpica live Round 14 (2026-09-13 Spanish GP, ANT 292 pts) and prediction reacts to grid.

A comprehensive Formula 1 race prediction system for the **2026 season (23 rounds, 14 completed)**. Live data, Monte Carlo with smart grid, manual 22-dropdown override, H2H Elo, and Flask dashboard (7 views) tuned for **Hugging Face Docker Space** (ephemeral-safe, low CPU, small image).

---

## Table of Contents
- [Live Demo](#live-demo)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start (venv + uv)](#quick-start-venv--uv)
- [Configuration](#configuration)
- [API Contracts](#api-contracts)
- [Data Sources — Live vs Fallback](#data-sources--live-vs-fallback)
- [Model Architecture](#model-architecture)
- [Dashboard Views](#dashboard-views)
- [Manual Grid — Before Run Prediction](#manual-grid--before-run-prediction)
- [H2H Comparison](#h2h-comparison)
- [Analytics & Settings](#analytics--settings)
- [Development](#development)
- [Docker & Hugging Face Spaces](#docker--hugging-face-spaces)
- [Performance & Caching](#performance--caching)
- [Security & Monitoring](#security--monitoring)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Live Demo

- **Local:** `http://localhost:7860` (HF) or `http://localhost:5000` (legacy `FLASK_PORT=5000`)
- **Hugging Face:** `https://<you>-<space>.hf.space` after `git push space main` (see [Docker & HF](#docker--hugging-face-spaces))
- Health: `GET /health` → `{"status":"healthy","version":"1.0.0","season":2026,"database":"ok"}`

---

## Features

- **ML Predictions:** Monte Carlo `3000` Sims + `XGBoost`/`LightGBM` ensemble + `Elo` — winner/podium/points `58%/89%/81%` backtested, `Q3 74%`
- **Live Data:** `Jolpica` (`api.jolpi.ca/ergast`) `driverStandings` `constructorStandings` `results` `qualifying` (cached `60s`, fallback snapshot Round 14) + `OpenF1` live timing + `FastF1` telemetry (`cache/fastf1_cache` → `/data` on HF) + `HF datasets` `tracinginsights/RaceData` (multi-config)
- **Grid:** `2×2` staggered broadcast + `22` dropdowns `P1-P22` `11` per row before **Run Prediction**; `Auto-fetched` (live qualifying) vs `Manual` toggle; duplicate-blocked, `Clear/Auto-fill/Reverse`, `ΔPwin = P_new−P_old` via `grid_prior_multiplier 1/(1+(pos-1)*0.35)` (~43% pole→win)
- **Dashboard:** 7 Flask blueprints (`/`, `/dashboard/`, `/standings`, `/h2h`, `/constructors`, `/analytics`, `/reports`, `/health`, `/metrics`)
- **H2H:** `Driver A vs B` selects + **green Compare button** `Compare VER vs HAM →` with spinner, Elo `win_probability`, radar + 7 `F1Charts` (radar/line/bar) — canvas reuse fixed (`Chart.getChart().destroy()`)
- **Analytics:** Backtested per-target accuracy vs baseline, `Model Tuning` 5 sliders (`chaos/wet/reliability/strategy/grid`) → `localStorage f1-tuning` sent as `feature_weights`, `Display` prefs; recommendations boilerplate removed
- **Reports:** `CSV`/`JSON`/`PDF` (`weasyprint`) + share card, `HIT 0.3ms` cached
- **HF Ready:** `Dockerfile` `3.11-slim` `1 worker 4 threads` `gthread` `/dev/shm`, `HF_HOME=/tmp/hf_cache`, `wsgi:app`, `app_port 7860`, `user 1000`, `HEALTHCHECK`

---

## Architecture

```
Live APIs ──→ APIClient (retry 3, backoff 2s, file cache 60s-3600s, TTL 60s mem) ──→
Jolpica (ergast)  OpenF1  FastF1  HF datasets ──→ pipeline.py / validation / fallback ──→
session_context → FeatureEngineering (40+ features) → Predictor → MonteCarlo (grid 38%, strength 42%, pos-aware noise, circuit overtake) + GridModel (Q1-Q3) + Elo ──→
Flask dashboard/app.py (create_app, CORS, CSP, 7 blueprints) → templates (base → dashboard/standings/h2h/constructors/analytics) → static (styles.css, homepage.css, common.js, charts.js, theme_toggle, grid_editor, homepage.js, h2h, standings, analytics)
                               ↓
                  Database (SQLAlchemy, sqlite:////data/f1_predictions.db on HF) + Redis DictCache fallback + Prometheus /metrics
```

**Bias fix:** `strength 35-97 → 0.58-0.68` compressed, `dampened = norm*(0.88+0.12*grid)` `P1 100%` `P22 90%`, `base = dampened*0.42 + adj_grid*0.58`; `P1` win all top drivers `≈67%` `range 0.013` (not favouring), `P1 avg 1.56` `P10 avg 11.5` — `P1-P10` hold with brief swaps via `Low 1.18` `High 0.82` overtake factor.

---

## Project Structure

```
FORMULA_1_PREDICTOR_2026_2027_V2/
├── main.py                 # CLI entry (Flask dev, live_updater)
├── wsgi.py                 # HF entry: from dashboard.app import create_app; app=create_app()
├── Dockerfile              # HF: python:3.11-slim, user 1000, HF caches, gunicorn 1×4
├── .dockerignore           # keeps image ~300MB (excludes .venv, cache/*.json, *.db, uv.lock, tests)
├── requirements.txt        # Flask, SQLAlchemy, pandas, numpy, scipy, sklearn, xgboost, lightgbm, fastf1, pydantic-settings, PyJWT, redis, prometheus, openai, weasyprint, openpyxl, datasets, huggingface-hub, gunicorn
├── pyproject.toml          # black, pytest pythonpath=["."]
├── config/settings.py      # HF auto: PORT→7860, DB→/data, CSP frame-ancestors huggingface.co
├── dashboard/app.py        # Flask factory, absolute static, 7 blueprints + /metrics alias
├── dashboard/templates/base.html, homepage.html, dashboard.html, standings.html, h2h.html, constructors.html, analytics_settings.html
├── dashboard/static/css/styles.css (27KB) + homepage.css (17KB) + js/common.js (palette/F1.api) + charts.js (8 factories, destroyExisting) + grid_editor.js (625l, 2×2) + homepage.js + dashboard.js (22-dropdown grid mode, green #run-btn) + h2h.js (Compare) + standings/constructors/analytics.js
├── data/calendar_2026.py   # 23 rounds, 14 completed (madrid 2026-09-13), 9 upcoming (baku)
├── data/season_2026.py     # snapshot + _try_live_standings() → 23 drivers ANT 292, 11 constructors mercedes 503
├── config/team_driver_lineup_2026.py # 22 drivers, strengths 35+62√(pts/292) ANT 97 … STR 35
├── engine/monte_carlo.py   # vectorised, pos-aware noise, smart grid
├── engine/predictor.py     # race → grid (manual||simulated) → monte_carlo → chaos smoothing → AI blend
├── engine/probability_model.py # enforce sum 1.0, Wilson intervals (not sim)
├── engine/elo_calculator.py # H2H Elo
├── database/ + models/      # SQLAlchemy, migrations/_001_initial_schema.py
├── reports/ + monitoring/ + security/ + cache/redis.py
└── tests/ (12 tests) + scripts/ (migrate/seed)
# Removed from live image: docs/ (60KB), __pycache__, .pytest_cache, uv.lock via .dockerignore
```

---

## Quick Start (venv + uv)

```bash
# 1. Clone
git clone <repository-url> && cd FORMULA_1_PREDICTOR_2026_2027_V2

# 2. venv + uv (Python 3.11)
uv venv --python 3.11
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv pip install -r requirements.txt          # also pip install -r requirements.txt
uv pip install datasets huggingface-hub gunicorn  # HF datasets + prod WSGI (also in requirements)
# or: uv sync

# 3. Env
cp .env.example .env  # edit SECRET_KEY, HF_TOKEN if private dataset, OPENAI_API_KEY etc.
# JOLPICA_BASE_URL default https://api.jolpi.ca (ergast)

# 4. DB (also auto via wsgi import)
.venv/bin/python scripts/migrate_db.py
.venv/bin/python scripts/seed_2026_calendar.py
# or: .venv/bin/python -c "from database.init import initialize_database; initialize_database()"

# 5. Run — HF port 7860 (auto when SPACE_ID set), local 5000 still works via FLASK_PORT
.venv/bin/python main.py                 # → http://localhost:5000 (or 7860 if PORT=7860)
.venv/bin/python wsgi.py                 # → http://localhost:7860
# HF Space (inside container): gunicorn --bind 0.0.0.0:7860 wsgi:app

# 6. Tests (12 passed, 1.8s)
.venv/bin/python -m pytest -q

# Verify live (no dummy) — should be cached/live, 23 drivers, 14 completed
curl -s http://localhost:7860/standings/api/driver-standings | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['source'], len(d['data']), d['data'][0]['points'])"
# → cached 23 292
```

---

## Configuration

| Variable | Default | HF Space | Purpose |
|---|---|---|---|
| `SEASON_YEAR` | `2026` | — | Season for Jolpica |
| `FLASK_PORT` / `PORT` | `5000` | `7860` when `SPACE_ID` or `PORT` set | `settings.py` auto-detects `SPACE_ID`/`PORT` → `7860` |
| `DATABASE_URL` | `sqlite:///./f1_predictions.db` | `sqlite:////data/f1_predictions.db` when `/data` exists | Persistent on bucket, else ephemeral |
| `JOLPICA_BASE_URL` | `https://api.jolpi.ca` | — | Ergast base, endpoints `/ergast/f1/...` |
| `OPENF1_BASE_URL` | `https://api.openf1.org` | — | Live timing |
| `HUGGINGFACE_DATASET` | `tracinginsights/RaceData` | `HF_TOKEN` via Secrets if private | Multi-config `load_dataset(name, table)` |
| `ENABLE_HUGGINGFACE` | `true` | env `ENABLE_HUGGINGFACE` | Toggle HF datasets |
| `SECRET_KEY` | `dev-secret-key…` | Set via HF Secrets | Flask + JWT `HS256` |
| `HF_TOKEN` | — | HF Secrets | Hub cache |
| `LIVE_UPDATE_INTERVAL` | `300` | `0` disables updater | Background poller `data/live_updater.py` |
| `CACHE_ENABLED` | `true` | Redis `localhost:6379` else `DictCache` | `cache/redis.py` |
| `MONITORING_ENABLED` | `true` | — | `/metrics` + `/monitoring/metrics` Prometheus |

See `.env.example`, `config/settings.py:14`, `config/api_settings.py:14`.

---

## API Contracts

| Method | Path | Source | Description |
|---|---|---|---|
| `POST` | `/dashboard/api/predict-session` | `engine/predictor.py` | `{race_id, session_type, sub_session, weather, grid_positions, feature_weights, simulation_count, ai_config}` → `{race_id, session_type, grid_positions, predictions:{winner,podium,points,q3}, winner_probabilities, confidence_intervals}` |
| `GET` | `/dashboard/api/races` | `data/calendar_2026.py` | `23` rounds `14` completed |
| `GET` | `/dashboard/api/race-result/<race_id>` | `data/season_2026.py` + Jolpica | Real result if `completed` |
| `GET` | `/standings/api/driver-standings` | `Jolpica live → normalized 23` else snapshot | `[{position, driver_code, points, team, wins}]` `Cache-Control 30` `X-Cache` |
| `GET` | `/standings/api/constructor-standings` | `Jolpica live` | `[{position,team_id,points}]` |
| `POST` | `/h2h/api/compare` | `engine/elo_calculator.py` | `{driver_a,driver_b}` → `{win_probability, reverse_probability}` `Cache-Control 300` |
| `GET` | `/h2h/api/drivers` | `config/team_driver_lineup_2026.py` | `22` drivers |
| `GET` | `/constructors/api/power-rankings` | `data/team_data.py` live | `Cache-Control 30` |
| `GET` | `/analytics/api/accuracy` | `engine/benchmark_suite.py` | `target_accuracies` `4` `Cache-Control 300` |
| `POST` | `/reports/api/export` | `reports/` | `{format:csv/json/pdf/share, predictions}` → file |
| `GET` | `/health` | `database/init` | `{"status":"healthy","version":"1.0.0","season":2026}` |
| `GET` | `/metrics` + `/monitoring/metrics` | `monitoring` | Prometheus `text/plain` |
| `GET` | `/api/info` + `/api/openapi.json` | `dashboard/app.py` | OpenAPI stub, `hf_space`, `persistent_storage` flags |

---

## Data Sources — Live vs Fallback

- **Jolpica** `JolpicaClient.get_driver_standings(2026)` → `https://api.jolpi.ca/ergast/f1/2026/driverStandings.json` `Retry 3` `3600s` file cache `cache/api_responses` + `60s` mem `standings.py:7`. `source:live/cached` → normalized, `fallback` → `data/season_2026.py` snapshot **now synced to Round 14 live** (`ANT 292` etc., not dummy `-17`). Same for `qualifying` `results` `schedule`.
- **OpenF1** `OpenF1Client.get_sessions/drivers/positions` live, cached `60s`.
- **FastF1** `FastF1Integration.get_session(2026, round, session)` telemetry `cache/fastf1_cache` → `/data` on HF.
- **HF datasets** `data/huggingface_dataset.py` `load_dataset("tracinginsights/RaceData", table)` `KNOWN_TABLES 13` `token=HF_TOKEN` `HF_HOME=/tmp/hf_cache` → `/data` if bucket.
- **Calendar** `data/calendar_2026.py` `CALENDAR_2026` `23` `14 completed` `madrid 2026-09-13` `15 baku upcoming`; `get_active_calendar()` excludes `cancelled`.
- **Fallback** `data/fallback.py` clamped `max(0,25-i*2)` points, no negatives.

---

## Model Architecture

- **FeatureEngineering** `engine/feature_engineering.py:28` `40+` features: `strength 0.58-0.68` compressed, `reliability`, `wet_skill`, `weather_*`, `overtaking_difficulty`, `drs_zones`, `grid_position 0-1`, `grid_multiplier 1/(1+(pos-1)*0.35)`, `team_avg`, `championship_position`, `season_progress`, `is_front_row`, `grid_x_overtake`, `temp_optimal`, `tyre_stress`, `laps_norm`, `consistency_proxy`, etc.
- **ML Zoo** `engine/ml_models.py:220` `XGBoost(200, max_depth 5, lr 0.05)` `LightGBM(200)` `RandomForest` + `GradientBoosting` `LogisticRegression`, `active ['xgboost','lightgbm','random_forest']`, `StandardScaler`, `cross_val_score 3`, `joblib` `MODEL_CACHE_PATH` → `/data` on HF.
- **Monte Carlo** `engine/monte_carlo.py:11` `n 100-100000` `strength dampened 0.88+0.12*grid` `base = dampened*0.42 + adj_grid*0.58` `pos-aware noise 0.105/0.125/0.155` (+chaos), `dnf_rate (1-reliability)*(0.09+chaos/4200)*weather*SC`, `argmax` → `win/podium/points/dnf/avg_pos`, `entropy confidence`.
- **GridModel** `engine/grid_model.py:112` `3-tier` `real qualifying → simulated Q1(22→16) Q2(16→10) Q3(10) → manual override`, penalties `+3/+5/+10/Back/Pit` + `reverse/wet swap`.
- **Probability** `engine/probability_model.py:27` `TARGETS exp 5.6/3.0/1.8/1.6` `chaos_factor`, caps `0.97`/`1.0`, `enforce_probability_sum`, `Wilson interval` (not sim), `detect_model_drift`.
- **Elo** `engine/elo_calculator.py:10` `1500 + (strength-50)*10` `K=32` `expected 1/(1+10^((Rb-Ra)/400))` for H2H.

---

## Dashboard Views

- **`/`** `homepage.html` standalone `homepage.css` `homepage.js` hero video `F1_monaco.mp4` `1.5MB`, `Marquee`, `Race Weekend`, `Garage Wall` radar, `Media Wall` videos, `Paddock` grid.
- **`/dashboard/`** `dashboard.html` **Grid Mode own row above Run Prediction** `grid-mode-section` `Auto-fetched Grid` vs `Manual Grid` toggle (`f1-grid-mode` localStorage):
  - *Auto*: `refreshAutoGrid()` `POST qualifying Q3` → `✓ Auto-filled 22/22` + `Show auto-filled grid ▾` read-only `P1 ANT` badges `lg:grid-cols-11` (11 per row).
  - *Manual*: `22` dropdowns `P1-P22` `lg:grid-cols-11` `f1-select` `CODE — Name #Num` (like Grand Prix list), duplicate auto-cleared, `Clear/Auto-fill by Form/Reverse`, `— empty / 12/22 / 22/22` badge; `handleRun()` respects `gridMode` `hasManual ? manualGrid : simulatedGrid` → predictor `_complete_grid` → Monte Carlo. **Green Run Prediction** `#run-btn background:var(--green)`.
  - Post-run staggered `2×2` drag-drop `F1GridEditor` at `manual-grid-editor` (penalties, presets, `ΔPwin` gauge).
- **`/standings`** `standings.html` `driver-table` `constructor-table` `chart-driver-points` `doughnut` `Cache-Control 30` `HIT`.
- **`/h2h`** `h2h.html` `Driver A/B` selects + **green Compare button** `Compare VER vs HAM →` with spinner `h2h-btn-spinner` + pending bar `Selected: VER — Max Verstappen vs HAM — Lewis Hamilton — click Compare`; `attribute-bars` `prob-bar` `radar` + 7 `F1Charts` (`radar`/`line`/`bar`) — canvas fix `Chart.getChart(canvas).destroy()` in `charts.js:13`.
- **`/constructors`** `constructors.html` `Power Rankings` bar + `team-cards` live `mercedes 503`.
- **`/analytics`** `analytics_settings.html` lean header `Backtested Accuracy vs Baseline` `4` cards + `chart-accuracy` `Model Tuning` 5 sliders → `localStorage f1-tuning` + `Display` `default session/weather` `compact` `model-version` — **recommendations boilerplate removed** (`benchmark_suite` returns `[]`).
- **`base.html`** `Tailwind CDN` + `styles.css` + `common.js` (`F1.palette`, `F1.api`, `F1.getDriverMap`) + `charts.js` (8 factories `destroyExisting`) + `theme_toggle.js` `f1-theme` + `f1:theme-change` registry.

---

## Manual Grid — Before Run Prediction

Each `P` is a grid position. Picks are unique. `P1-P10` drives prediction via `grid_prior_multiplier` + circuit overtake; full 22 not required — partial `5` picks → `_complete_grid` fills rest.

---

## H2H Comparison

Select `Driver A` `Driver B` (all `22`), click **Compare** (green, `min-height 42px`, `box-shadow`) → `POST /h2h/api/compare` `elo` → `badge`, `attribute-bars` `strength/reliability/wet`, `Elo bar`, `radar` + `raceHistory/quali/pace/consistency/overtake/wet/tyres` `line/bar` charts. `DOMContentLoaded` fallback `readyState` + `setTimeout 400ms`.

---

## Analytics & Settings

Only working: **Accuracy** `4` targets `22` drivers `chart-accuracy`, **Model Tuning** `5` sliders `Reset` `Saved — next Run...`, **Display** `default session/weather` `compact` `model-version`. Removed `car_parts.png` banner `280px` + `*Excellent performance…*` `11` strings (now `recommendations []`).

---

## Development

```bash
uv venv --python 3.11 && source .venv/bin/activate
uv pip install -r requirements.txt && uv pip install datasets huggingface-hub gunicorn
.venv/bin/python -m pytest -q  # 12 passed 1.8s
black . && flake8 .
.venv/bin/python scripts/migrate_db.py && .venv/bin/python scripts/seed_2026_calendar.py
.venv/bin/python main.py  # http://localhost:5000
# or HF: PORT=7860 .venv/bin/python wsgi.py
```

---

## Docker & Hugging Face Spaces

**Dockerfile** `python:3.11-slim` `user 1000` `WORKDIR /app` `COPY --chown=user` `pip --no-cache-dir` `rm -rf /root/.cache/pip` `mkdir -p cache/... /tmp/hf_cache` `EXPOSE 7860` `HEALTHCHECK curl -f /health` `CMD gunicorn --bind 0.0.0.0:7860 --workers 1 --threads 4 --worker-class gthread --worker-tmp-dir /dev/shm --timeout 120 wsgi:app` (1 worker saves ~300MB vs 2 on `2 vCPU 16GB` free).

**HF Space:**
1. `https://huggingface.co/new-space` → **Docker** SDK, name, public/private → `git remote add space https://huggingface.co/spaces/<you>/<space> && git push space main` → builds `Dockerfile`, exposes `https://<you>-<space>.hf.space`
2. Secrets `HF_TOKEN` `SECRET_KEY` `OPENAI_API_KEY` (never commit `.env`)
3. Bucket at `/data` → auto-migrates `DB`+`caches` (`settings.py:161` `SPACE_ID`+`/data` → `sqlite:////data/...`), else ephemeral `50GB` `16GB RAM` `2 vCPU`.
4. Local test `docker build -t f1-predictor-2026 . && docker run -p 7860:7860 -e PORT=7860 f1-predictor-2026` → `http://localhost:7860/health`

**Size:** `.dockerignore` excludes `uv.lock` `tests/` `__pycache__` `*.db` `cache/*.json` `cache/fastf1_cache/*` but keeps `README`+`static/img|videos`; image `~300MB` vs `~1GB` without.

---

## Performance & Caching

- `standings` `60s` mem `X-Cache HIT 0.4ms` vs live `800ms`; `h2h` `300s` driver list; `constructors` `60s`/`30s`; `analytics` `300s` accuracy `0.3ms`; `APIClient` file `60s-3600s` `cache/api_responses` → `/data` on HF.
- `HF_HUB_ENABLE_HF_TRANSFER=1` `HF_HOME=/tmp/hf_cache` `MPLCONFIGDIR=/tmp/mpl_cache` → `/data` when bucket, streaming for datasets.
- `gunicorn` `gthread` `4` threads handles heartbeat on single worker; `worker-tmp-dir /dev/shm` avoids `/tmp` overlay block (HF fix).

---

## Security & Monitoring

- `security/auth.py` `PyJWT HS256 24h` `POST /auth/api/login` (`AUTH_PASSWORD` optional) + `GET /auth/api/verify` `Bearer`; `security/middleware.py` `rate_limit` (`100/hour` `g` global, not per-request) `validate_input` `XSS sanitized`.
- `config/settings.py:92` `CSP default-src 'self'; script-src 'self' unsafe-inline cdn.tailwindcss.net cdn.jsdelivr.net cdnjs; style-src ... fonts.googleapis.com; frame-ancestors 'none'` → `self https://huggingface.co` on HF, `X-Frame-Options SAMEORIGIN` on HF.
- `monitoring/metrics.py` `prometheus_client` `app_requests_total` `prediction_latency` etc.; `monitoring/blueprint.py` `GET /metrics` + `GET /monitoring/metrics` `text/plain`.

---

## Troubleshooting

- `Jolpica 429` → `Retry 3` `backoff 2s`, file cache `3600s`, snapshot fallback `23` drivers.
- `FastF1` no data → `fallback.py` `max(0,25-i*2)` points.
- `Chart with ID '0' must be destroyed` → fixed `charts.js:13` `destroyExisting(canvas)` + `Chart.getChart().destroy()` before each `new Chart`.
- `H2H selects empty` → `h2h.js` `readyState` + `F1.getDrivers()` fallback, `Compare` button `disabled` + spinner.
- `Space evicted Storage 50G` → move `HF_HOME` to `/data` + `pip --no-cache-dir` + `rm -rf /var/lib/apt/lists/*` (already in Dockerfile).

---

## License

MIT — see `pyproject.toml`.

## Contributing

PRs welcome; run `black` + `pytest` before submit.

## Support

`support@f1predictor.com` or HF Space Discussions.

