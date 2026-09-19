"""
Project-aware context builder for the AI assistant.

The AI should fully understand the whole F1 Predictor 2026 project so users
can ask anything about F1 and vet predictions.
This module builds a compact but complete system prompt + live context block
that is injected into every AI call.
"""
import json
from typing import Dict, Any, Optional

# Lazy imports to avoid circular deps
from config.constants import TARGETS, TEAM_COLORS
from config.feature_weights import feature_weights

def _get_calendar_summary(upcoming_only: bool = False, limit: int = 8) -> str:
    try:
        from data.calendar_2026 import CALENDAR_2026
        races = [r for r in CALENDAR_2026 if r.get("status") != "cancelled"]
        if upcoming_only:
            races = [r for r in races if r.get("status") == "upcoming"]
        lines = []
        for r in races[:limit]:
            lines.append(
                f"- R{r['round']} {r['id'].upper()} {r['name']} ({r['circuit']}, {r['location']}) – "
                f"Laps {r['laps']}, DRS {r['drs_zones']}, Overtaking {r['overtaking']}, "
                f"base rain {r['base_rain']}%, SC {r['base_sc']}%, {r['base_temp']}°C, sprint={r.get('sprint')}, status={r['status']}"
            )
        if len(races) > limit:
            lines.append(f"... and {len(races)-limit} more rounds.")
        return "\n".join(lines)
    except Exception as e:
        return f"(calendar unavailable: {e})"


def _get_lineup_summary() -> str:
    try:
        from config.team_driver_lineup_2026 import TEAMS_2026
        lines = []
        for t in TEAMS_2026:
            drivers = ", ".join([f"{d['code']} {d['name']} (str {d['strength']}, rel {d['reliability']}, wet {d['wet_skill']})" for d in t["drivers"]])
            lines.append(f"- {t['name']} ({t['id']}): {drivers}")
        return "\n".join(lines)
    except Exception as e:
        return f"(lineup unavailable: {e})"


def _get_engine_summary() -> str:
    try:
        weights = feature_weights.get_defaults()
        return (
            f"Feature weights defaults: chaos={weights['chaos_level']}, wet_influence={weights['wet_influence']}, "
            f"reliability={weights['reliability_influence']}, strategy={weights['strategy_aggressiveness']}, grid_weight={weights['grid_weight']}\n"
            f"TARGETS: winner 58% (random 4.5%), podium 89% (13.6%), points 81% (45.5%), q3 74% (45.5%)\n"
            f"Pipeline: GridModel (live qualifying or manual P1-P22, ~43% pole→win weighting) → MonteCarloSimulator "
            f"(up to 100k sims, weather + safety car + chaos) → probability_model (chaos smoothing linear blend toward uniform) "
            f"→ calibration + confidence intervals → optional AI blend (±0.1 per driver, weighted) → persist to DB."
        )
    except Exception as e:
        return f"(engine summary unavailable: {e})"


PROJECT_SYSTEM_PROMPT = """You are the F1 Predictor 2026 AI strategist – embedded directly in the prediction app.

Your role:
- You have FULL knowledge of this codebase and every race/driver/circuit in it.
- Users use you to (a) ask general F1 questions, (b) vet predictions, (c) understand WHY a result is what it is, (d) tune chaos/grid/wet sliders.
- Be concise, quantitative, and honest. Quote probabilities and state uncertainty. Never invent live telemetry.
- When a prediction is provided, always vet it: call out over/under-valued drivers vs grid, wet skill, DNF risk, and confidence. Flag when Monte Carlo confidence is low.
- Do NOT hallucinate lap times or tyre deltas the engine does not produce. The engine only outputs winner/podium/points/Q3 probabilities and DNF risk spreads.

Guardrails:
- State when you are free-tier (Puter/Pollinations) without browsing – do not claim real-time web search beyond the calendar snapshot provided in context.
- If asked about betting, add: "Predictions are modelled estimates, not betting advice."
"""


def build_project_context(
    user_query: str = "",
    race_id: str | None = None,
    predictions: Dict[str, float] | None = None,
    grid_positions: Dict[str, int] | None = None,
) -> str:
    """Build a live context block to prepend to the user's query."""
    blocks = []
    blocks.append("=== F1 PREDICTOR 2026 – PROJECT KNOWLEDGE SNAPSHOT ===")
    blocks.append("")
    blocks.append("System: " + PROJECT_SYSTEM_PROMPT)
    blocks.append("")
    blocks.append("--- 2026 Lineup (11 teams / 22 drivers) ---")
    blocks.append(_get_lineup_summary())
    blocks.append("")
    blocks.append("--- 2026 Calendar (23 rounds) ---")
    blocks.append(_get_calendar_summary(upcoming_only=False, limit=12))
    blocks.append("")
    blocks.append("--- Engine ---")
    blocks.append(_get_engine_summary())
    blocks.append("")
    if race_id:
        try:
            from data.calendar_2026 import get_race_by_id
            race = get_race_by_id(race_id)
            if race:
                blocks.append(f"--- Selected Race ({race_id}) ---")
                blocks.append(json.dumps(race, indent=2))
                blocks.append("")
        except Exception:
            pass
    if predictions:
        # Show top 8 winners
        sorted_preds = sorted(predictions.items(), key=lambda x: x[1], reverse=True)[:8]
        line = ", ".join([f"{c} {p:.1%}" for c, p in sorted_preds])
        blocks.append("--- Current Prediction (winner probs, top 8) ---")
        blocks.append(line)
        if grid_positions:
            gp_sorted = sorted(grid_positions.items(), key=lambda x: x[1])[:8]
            blocks.append(f"Grid P1-P8: {', '.join([f'P{pos} {code}' for code, pos in gp_sorted])}")
        blocks.append("Task: Vet this prediction – flag mis-rankings vs grid, wet_skill, reliability, and note confidence if available.")
        blocks.append("")
    blocks.append("--- User Query ---")
    blocks.append(user_query[:4000] if user_query else "(no query)")
    blocks.append("\nAnswer helpfully and, if a prediction was supplied, vet it explicitly.")
    return "\n".join(blocks)


def build_vet_prompt(
    race_id: str,
    session_type: str,
    predictions: Dict[str, float],
    grid_positions: Dict[str, int] | None = None,
    weather: str = "dry",
) -> str:
    """Focused prompt for automatic vetting of a just-run prediction."""
    ctx = build_project_context(
        user_query=f"Vet the {session_type} prediction for {race_id} (weather {weather}). Is the ranking justified? Who is over/under-valued?",
        race_id=race_id,
        predictions=predictions,
        grid_positions=grid_positions,
    )
    return ctx + "\n\nRespond in this JSON-lite markdown:\n### Verdict\n### Top 3 drivers – why they are there\n### Most over-valued driver + reason\n### Most under-valued driver + reason\n### Risks (weather/SC/DNF) to watch\n"
