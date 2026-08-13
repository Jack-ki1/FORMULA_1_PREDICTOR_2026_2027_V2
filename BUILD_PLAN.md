# F1 Predictor 2026 — Build Plan

*From React prototype to a real, running Python service — `py main.py`*

This plan takes the folder structure you researched from an older F1 project and tunes it against what's actually been prototyped in the JSX dashboard: live Jolpica standings, a genuinely tunable model (chaos level, wet-weather influence, reliability influence, strategy aggressiveness, grid-position weight), real qualifying → race grid auto-fill with manual override, session-specific charts for Friday/Saturday/Sunday, fantasy-league scoring, and a verified 23-round 2026 calendar. Every module below either maps to something already working in the JSX or fills a real gap the reference structure left open (no tests, no OpenF1 client despite being named, no standings page, a typo'd script name, etc.).

---

## 1. What changed from the reference structure, and why

| Reference had | This plan does instead | Why |
|---|---|---|
| One flat `dashboard/app.py` | `dashboard/blueprints/*.py` split by section | The JSX has 6 real sections (Dashboard, Standings, H2H, Constructors, Analytics & Settings, Report) plus the landing page — one file would become unmanageable fast, same lesson the JSX itself learned at ~280KB in one component tree |
| No `standings.html` | Added | Standings is a full tab in the JSX (live points, points-share pie, championship battle chart) — it can't be an afterthought |
| `download.html` | Renamed `reports.html` | Matches the actual nav label ("Download Report") and the tab's real behavior (6 export formats, not one download) |
| `optimize_weights_v.py` | `optimize_weights.py` | Fixing the stray `_v` — also now explicitly tunes the same 5 parameters exposed as sliders in the JSX (chaos, wet, reliability, strategy, grid weight) |
| `huggingface_models.py` present but no client for it | Added `data/huggingface_dataset.py` + kept `engine/huggingface_models.py` | The JSX names HF (`tracinginsights/RaceData`) as a data source but never actually calls it — this plan makes that real: HF for historical archive data, a separate optional path for any HF-hosted model checkpoint |
| API settings named OpenF1/FastF1 but never wired | Added `data/openf1_client.py`, kept `fastf1_integration.py` with concrete responsibilities | Same honesty principle the JSX followed (its Settings tab explicitly told you which sources were "really live" vs "represented") — the backend needs to actually deliver on that promise |
| No grid/qualifying module | Added `engine/grid_model.py` | This is the single most important recent feature in the JSX (real-qualifying-informs-race-prediction, ~43% historical pole-to-win rate) — it deserves its own module, not a buried function |
| No fantasy scoring module | Added `engine/fantasy_scoring.py` | The JSX's Expected Fantasy Points chart was an approximation; production should implement the real F1 Fantasy ruleset |
| No tests anywhere | Added `tests/` | A prediction product with an accuracy claim on its homepage needs a test suite backing that claim, full stop |
| No "My Picks" / leaderboard support | Added `UserPick`/`LeaderboardEntry` tables + `post_race_evaluation.py` resolves them | Carries forward the persistent-picks idea (window.storage in the JSX prototype) into a real multi-user database |
| Single `migrations.py` | Kept, but plan notes Alembic as the recommended real-world swap | Hand-rolled migrations don't scale past a few schema changes |

---

## 2. Adapted folder structure

```
f1_predictor_2026/
├── main.py                          # `py main.py` — boots Flask app + background schedulers
├── requirements.txt
├── pyproject.toml
├── Dockerfile
├── .dockerignore
├── .env.example                     # API base URLs, season year, secret key — never commit real .env
├── README.md
├── NEXT_SEASON_MIGRATION_GUIDE.md
│
├── cache/
│   ├── api_responses/               # raw Jolpica/OpenF1 JSON, TTL'd
│   ├── fastf1_cache/                # FastF1's own on-disk cache
│   └── model_cache/                 # trained model artifacts (joblib/pickle), feature matrices
│
├── config/
│   ├── settings.py                  # season year, debug flag, cache TTLs, Flask config
│   ├── api_settings.py              # Jolpica/OpenF1/FastF1 base URLs, retry/backoff, rate limits
│   ├── feature_weights.py           # chaos_level, wet_influence, reliability_influence,
│   │                                 # strategy_aggressiveness, grid_weight — defaults + valid ranges,
│   │                                 # 1:1 with the five sliders in the JSX's Model Tuning tab
│   ├── constants.py                 # team hex colors, Pirelli compound colors, F1 points table,
│   │                                 # target definitions (winner/podium/points/q3) with each target's
│   │                                 # own backtested-accuracy baseline
│   └── team_driver_lineup_2026.py   # single source of truth: 11 teams / 22 drivers, numbers,
│                                     # strength/reliability/wetSkill seed values (mirrors TEAMS in JSX)
│
├── dashboard/
│   ├── app.py                       # Flask app factory, registers all blueprints
│   ├── blueprints/
│   │   ├── landing.py               # "/" — the F1 Predict-style homepage
│   │   ├── predictions.py           # "/dashboard" — Friday/Saturday/Sunday, all targets
│   │   ├── standings.py             # "/standings" — live + per-race scoped view
│   │   ├── h2h.py                   # "/h2h" — driver vs driver, live + per-race scoped
│   │   ├── constructors.py          # "/constructors"
│   │   ├── analytics_settings.py    # "/analytics" — accuracy, tuning, data sources, display
│   │   └── reports.py               # "/reports" — CSV/JSON/print/share exports
│   ├── static/
│   │   ├── css/styles.css
│   │   ├── js/
│   │   │   ├── dashboard.js
│   │   │   ├── charts.js            # Chart.js/Plotly wiring — the JS equivalent of the JSX's Recharts layer
│   │   │   ├── common.js
│   │   │   ├── grid_editor.js       # manual P1-P22 override widget (mirrors ManualGridEditor)
│   │   │   └── theme_toggle.js      # light/dark swap (mirrors the JSX's Proxy-based theme system)
│   │   └── img/                     # logo + the same "image slot" placeholders used in the JSX
│   └── templates/
│       ├── base.html                # shared nav/footer layout (mirrors NavBar.jsx)
│       ├── landing.html             # mirrors LandingPage.jsx
│       ├── dashboard.html
│       ├── h2h.html
│       ├── constructors.html
│       ├── standings.html
│       ├── analytics_settings.html
│       └── reports.html
│
├── data/
│   ├── driver_data.py                # bios, numbers, wetSkill, reliability seeds
│   ├── team_data.py                  # team colors, constructor metadata
│   ├── circuit_data.py               # laps/length/DRS zones/overtaking rating per circuit
│   ├── calendar_2026.py              # the verified 23-round calendar, incl. the 2 real cancellations
│   ├── season_2026.py                # local snapshot of season-to-date results
│   ├── api_client.py                 # generic HTTP client: retries, backoff, response caching
│   ├── jolpica_client.py             # standings / per-round results / qualifying wrapper
│   ├── openf1_client.py              # live session & telemetry client
│   ├── fastf1_integration.py         # lap-by-lap telemetry → practice/qualifying features
│   ├── huggingface_dataset.py        # tracinginsights/RaceData historical archive loader
│   └── live_updater.py               # background poller, refreshes cache on an interval
│
├── engine/
│   ├── predictor.py                  # orchestrates: features → model zoo → probability → calibration
│   ├── feature_engineering.py        # builds the feature matrix per driver per session
│   ├── ml_models.py                  # the model zoo (§6)
│   ├── ensemble_predictor.py         # blends model zoo outputs
│   ├── probability_model.py          # session/target-aware probability shaping (chaos level, exponents)
│   ├── monte_carlo.py                # N-simulation race engine (the "Simulations" input + confidence score)
│   ├── elo_calculator.py             # driver Elo, updated race-by-race
│   ├── grid_model.py                 # real qualifying → grid, simulated fallback, manual override
│   ├── pit_strategy.py               # stint/compound strategy prediction
│   ├── tire_model.py                 # degradation curves per compound/circuit
│   ├── weather_model.py              # wet-skill blending
│   ├── safety_car_model.py           # SC probability by lap-window
│   ├── fantasy_scoring.py            # real F1 Fantasy ruleset
│   ├── huggingface_models.py         # optional: inference against any HF-hosted checkpoint
│   ├── benchmark_suite.py            # backtesting harness — source of all "accuracy vs baseline" numbers
│   └── calibration.py                # isotonic/Platt calibration on top of raw model output
│
├── database/
│   ├── models.py                     # SQLAlchemy models (§9)
│   ├── connection.py
│   └── migrations.py                 # or Alembic — see §9 note
│
├── reports/
│   ├── csv_excel_report.py
│   ├── pdf_generator.py              # real PDF, not just a browser print dialog
│   └── share_card_generator.py       # shareable text/image summary
│
├── scripts/
│   ├── migrate_db.py
│   ├── seed_2026_calendar.py         # one-time loader for calendar + roster
│   ├── measure_accuracy.py
│   ├── calibrate_probabilities.py
│   ├── optimize_weights.py
│   ├── post_race_evaluation.py       # resolves pending user picks after a real race happens
│   ├── data_quality_report.py
│   └── generate_results_template.py
│
└── tests/
    ├── test_probability_model.py
    ├── test_grid_autofill.py
    ├── test_fantasy_scoring.py
    └── test_api_clients.py
```

---

## 3. Data flow

```
                        ┌─────────────────────┐
                        │   live_updater.py    │  (background, every N minutes)
                        └──────────┬───────────┘
                                   │
        ┌──────────────┬──────────┼───────────────┬──────────────────┐
        ▼              ▼          ▼               ▼                  ▼
  jolpica_client   openf1_client  fastf1        huggingface     (manual grid
  (standings,      (live/session  _integration   _dataset        override, if
   results, quali)  timing)       (telemetry)    (historical)     user supplies one)
        │              │          │               │                  │
        └──────────────┴──────────┴───────────────┴──────────────────┘
                                   │
                          cache/api_responses/
                                   │
                                   ▼
                       feature_engineering.py
                     (grid pos., form, reliability,
                      weather, circuit character)
                                   │
                                   ▼
                            ml_models.py  ──┐
                                   │        │  (ensemble_predictor.py blends these)
                     elo_calculator.py   ───┤
                     monte_carlo.py      ───┤
                     tire/weather/SC models ┘
                                   │
                                   ▼
                          probability_model.py
                        (chaos level, target exponent)
                                   │
                                   ▼
                            calibration.py
                                   │
                                   ▼
                            predictor.py
                          (final API response)
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              dashboard/      reports/       database/
              (Flask routes)  (CSV/PDF/      (Prediction,
                                share card)    UserPick rows)
```

---

## 4. Module responsibilities in detail

### `config/`
- **`feature_weights.py`** is the most important file to get right early — it's the direct backend counterpart of the JSX's Model Tuning tab. Store each parameter as `(default, min, max, step)` so both the API and the Flask templates can render an identical slider without duplicating bounds logic.
- **`constants.py`** should own the `TARGETS` definitions (winner/podium/points/q3) *including* each one's own backtested-accuracy baseline — this is what lets the Analytics tab say "89% vs 13.6% random baseline" instead of one misleading blended number, which was a deliberate design decision worth preserving.

### `data/`
- **`jolpica_client.py`** — three methods: `get_driver_standings(season)`, `get_constructor_standings(season)`, `get_race_result(season, round)`, `get_qualifying_result(season, round)`. Every one needs a try/except that falls back to simulated data and returns a `source: "live" | "simulated" | "error"` tag — the JSX's honesty pattern (visible badges everywhere) should survive the port to Python.
- **`openf1_client.py`** — this is genuinely new work, not a port. Start with `get_session_key(meeting, session_type)` and `get_live_positions(session_key)`. This is what would eventually power a *real* live-timing view during a session, which the JSX could only fake with countdown timers.
- **`fastf1_integration.py`** — practice/qualifying lap-by-lap data. This is the real data source behind what the JSX's `PaceEvolutionChart`, `SectorComparisonChart`, and `ConsistencyChart` currently simulate. Cache aggressively — FastF1's own cache plus an additional TTL layer, since lap data for a session doesn't change once the session ends.

### `engine/` — see §6 for the full model zoo
- **`grid_model.py`** is the direct backend counterpart of `useQualifyingResult` + `ManualGridEditor` + `gridPriorMultiplier` in the JSX. Keep the same three-tier fallback: real qualifying → simulated Q1-Q3 → manual entry, and keep the `gridPriorMultiplier(position) = 1 / (1 + (position - 1) * 0.16)` curve, since it's grounded in a real, citable stat (~43% historical pole-to-win rate) rather than an arbitrary shape.
- **`fantasy_scoring.py`** should implement the *actual* F1 Fantasy rules (position points + qualifying bonus + overtake bonus + fastest lap + DNF handling), replacing the JSX's honestly-labeled approximation.
- **`benchmark_suite.py`** is what makes every accuracy number on the site defensible. It should run on held-out historical seasons and report accuracy *per target*, never one blended figure — this was a deliberate stance in the JSX and should be a hard rule in the backend too.

### `dashboard/`
- Splitting into `blueprints/` isn't just tidiness — it mirrors the JSX's own tab components almost 1:1, which makes the port mechanical rather than a redesign. Each blueprint's route should return exactly the JSON shape its matching JSX component already expects, so the frontend can eventually point at real endpoints with minimal changes.

### `reports/`
- **`pdf_generator.py`**: use WeasyPrint (HTML/CSS → PDF) rather than a from-scratch layout engine — it can reuse the same Jinja template as `reports.html`'s printable view, which mirrors how the JSX's "Printable Summary" already builds a clean HTML string and hands it to the browser's print dialog.

### `database/`
- Recommend swapping `migrations.py` for **Alembic** once the schema stabilizes past ~5 tables. Hand-rolled migration scripts are fine for the first month, painful after that.

---

## 5. The ML model zoo (`engine/ml_models.py`)

"As many as possible" — organized by what each one is actually good for, so the choice isn't arbitrary:

| Model | Role | Why it's in the zoo |
|---|---|---|
| **Gradient boosted trees** (XGBoost or LightGBM) | Primary tabular predictor for finish position / podium / points classification | Best-in-class for structured, mixed-type tabular data with the sample sizes F1 actually has (~20 races/season) |
| **Random Forest** | Secondary model for ensemble diversity + feature importance sanity checks | Less prone to overfitting on small data than boosting alone; easy to inspect which features actually matter |
| **Logistic Regression** | Interpretable baseline for binary targets (podium yes/no, points yes/no) | If the boosted model can't beat logistic regression by a meaningful margin, that's a signal the features need work, not the model |
| **Elo rating system** | Driver skill rating, updated race-by-race, independent of car performance | Standard approach in real F1 analytics for separating "driver ability" from "car performance" — also directly feeds the H2H comparison |
| **Monte Carlo race simulator** | Full-race simulation (thousands of runs) accounting for DNF risk, safety cars, and strategy variance | Not a classifier — a simulator. This is what the JSX's "Simulations" input and resulting confidence score represent; running it thousands of times per prediction is what actually gives a defensible confidence number instead of a cosmetic one |
| **Bayesian hierarchical model** (e.g., PyMC) | Decomposes results into team (car) skill vs. individual driver skill, with uncertainty intervals | Lets the platform eventually say "we're 80% confident the true probability is between X% and Y%" instead of a single point estimate — a real upgrade path once the basics are solid |
| **Survival analysis model** (Cox proportional hazards or similar) | DNF/reliability modeling — time-to-failure framing instead of a binary flag | This is a genuinely better way to model reliability than the JSX's threshold-based Low/Medium/High buckets, and it's a standard technique for exactly this kind of problem |
| **Gaussian Process regression** | Smooth modeling of track evolution across Q1→Q2→Q3 and lap-by-lap pace trends | Naturally handles the "smooth curve with uncertainty" shape those JSX charts are currently faking with hand-tuned formulas |
| **Ensemble / stacking meta-learner** (`ensemble_predictor.py`) | Combines the above into one calibrated output | Simple weighted averaging to start; a small logistic meta-learner over the base models' outputs once there's enough backtest data to train one properly |
| **Hugging Face model integration** (`huggingface_models.py`) — optional | Two legitimate uses: (1) version and serve a trained tabular checkpoint via the HF Hub for reproducibility, or (2) an auxiliary NLP signal — sentiment on team-radio transcripts / pre-race news — as a small "buzz" feature, clearly flagged as experimental | This is the one place worth being disciplined about scope: don't reach for a transformer where gradient boosting will outperform it on tabular data. Use HF for hosting/versioning or genuine text signals, not as a replacement for the tabular model zoo above |

**Phasing note:** don't build all of these at once. See §8 for the recommended order — start with gradient boosting + Monte Carlo + Elo, since those three alone can already beat the JSX's illustrative model on real backtests.

---

## 6. API integration status (honest, matching the JSX's own disclosure pattern)

| Source | JSX prototype status | Backend target |
|---|---|---|
| Jolpica | **Actually live** — standings, per-round results, qualifying | Same three endpoints, now server-side with caching |
| OpenF1 | Named as a data source, never called | Build `openf1_client.py` from scratch — first real use case |
| FastF1 | Named as a data source, never called | Build `fastf1_integration.py` — powers practice/qualifying features properly for the first time |
| Hugging Face (tracinginsights/RaceData) | Named, never called | Build `huggingface_dataset.py` for historical backtesting data |
| Recharts | Genuinely used throughout the JSX | Swap for Chart.js or Plotly server-side/JS — same visual language, different runtime |

Carry the JSX's core honesty pattern into every one of these: every route/response should include a `source` field (`live` / `simulated` / `cached`), and the frontend should always visibly say which one it got — never silently substitute one for the other without telling the user.

---

## 7. Database schema (`database/models.py`)

```
Team(id, name, color_hex)
Driver(id, code, name, number, team_id, wet_skill, reliability_base)
Circuit(id, name, location, laps, length_km, drs_zones, overtaking_rating)
Race(id, season, round, circuit_id, date, status[completed|upcoming|cancelled], sprint bool)
QualifyingResult(race_id, driver_id, position, source[live|simulated|manual])
RaceResult(race_id, driver_id, position, points, status, grid)
Prediction(id, race_id, session, target, driver_id, probability, model_version, created_at)
UserPick(id, user_nickname, race_id, session, target, driver_id, made_at, status, points)
LeaderboardEntry(nickname, total_score, updated_at)  -- shared/public
ModelRun(id, target, accuracy, baseline, backtest_season, created_at)  -- benchmark_suite.py output
```

`UserPick` + `LeaderboardEntry` are new relative to the reference structure — they exist to carry forward the persistent "My Picks" idea from the JSX prototype (which used the artifact's own key-value storage) into a real multi-user database.

---

## 8. Recommended build order

1. **Data foundation**: `calendar_2026.py`, `driver_data.py`, `team_data.py`, `jolpica_client.py` + caching. Nothing else works without this.
2. **Core prediction loop**: `feature_engineering.py` → gradient boosting model → `probability_model.py` (chaos level) → `predictor.py`. Get one target (podium) working end-to-end before adding others.
3. **Grid autofill**: `grid_model.py`. This is high-value and was the single biggest accuracy lever identified in the JSX phase — don't leave it for later.
4. **Flask dashboard**: `app.py` + `blueprints/predictions.py` + `dashboard.html`, rendering the same session/target structure as the JSX.
5. **Remaining tabs**: standings, H2H, constructors, analytics/settings, reports — in that order, since standings' live data feeds the others.
6. **Model zoo expansion**: Elo, Monte Carlo, ensemble — validate each addition against `benchmark_suite.py` before keeping it.
7. **Fantasy layer**: `fantasy_scoring.py`, `UserPick`/`LeaderboardEntry` tables, `post_race_evaluation.py`.
8. **Polish**: reports (PDF/share card), OpenF1/FastF1/HF integrations, Bayesian/survival/GP models as time allows.

---

## 9. Running it

```bash
pip install -r requirements.txt
py main.py
```

`main.py` should be a thin entry point: load `config/settings.py`, start `data/live_updater.py` as a background thread/scheduler, then hand off to the Flask app factory in `dashboard/app.py`. Keep it thin on purpose — if `main.py` grows past ~50 lines, logic has leaked into it that belongs in `config/` or `engine/`.

---

## 10. What this plan deliberately does not solve yet

- **Authentication** — `UserPick`/`LeaderboardEntry` use a plain nickname, no real accounts. Fine for an MVP, not for production.
- **Real-time push updates** — the JSX polls/refetches; a production live-timing view (via OpenF1) would want websockets eventually.
- **Model retraining cadence** — `optimize_weights.py` and `calibrate_probabilities.py` exist but this plan doesn't prescribe *when* they run. Recommend: after every completed race, via `post_race_evaluation.py`.

See `NEXT_SEASON_MIGRATION_GUIDE.md` for what changes when the calendar, roster, or regulations reset for 2027.
