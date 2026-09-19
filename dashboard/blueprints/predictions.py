import logging
import json
from flask import Blueprint, request, jsonify, render_template
from engine.predictor import generate_prediction
from config.settings import settings
from data.calendar_2026 import CALENDAR_2026, get_race_by_id
from data.circuit_data import CIRCUITS

logger = logging.getLogger(__name__)

predictions_bp = Blueprint('predictions', __name__)


@predictions_bp.route('/')
def index():
    """Render the main dashboard page."""
    try:
        # Filter out cancelled races to show only valid race options
        valid_calendar = [race for race in CALENDAR_2026 if race.get('status') != 'cancelled']
        logger.info(f"Rendering dashboard with {len(valid_calendar)} valid races (from {len(CALENDAR_2026)} total)")
        return render_template('dashboard.html', calendar=valid_calendar)
    except Exception as e:
        logger.error(f"Error rendering dashboard: {e}")
        return render_template('dashboard.html', calendar=[])


@predictions_bp.route('/api/races')
def api_races():
    """Return calendar data as JSON for the dashboard."""
    return jsonify(CALENDAR_2026)


@predictions_bp.route('/api/race-result/<race_id>')
def api_race_result(race_id):
    """Return result for a completed race (or 404 if not completed)."""
    race = get_race_by_id(race_id)
    if not race:
        return jsonify({'error': 'Race not found'}), 404
    if race.get('status') != 'completed':
        return jsonify({'error': 'Race not yet completed'}), 404
    return jsonify(race)


@predictions_bp.route('/api/predict-session', methods=['POST'])
def api_predict_session():
    """Generate predictions for a race session from the dashboard UI."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    race_id = data.get('race_id')
    session_type = data.get('session_type', 'race')
    sub_session = data.get('sub_session')  # New parameter for FP1, FP2, FP3, Q1, Q2, Q3
    weather = data.get('weather', 'dry')
    grid_positions = data.get('grid_positions')
    feature_weights = data.get('feature_weights')
    simulation_count = data.get('simulation_count', 10000)
    ai_mode = data.get('ai_mode', 'normal')
    ai_model = data.get('ai_model', 'gemini-2.0-flash-exp')
    ai_api_key = data.get('ai_api_key', '')
    ai_weight = data.get('ai_weight', 0.3)
    ai_temperature = data.get('ai_temperature', 0.7)

    if not race_id:
        return jsonify({'error': 'race_id is required'}), 400

    try:
        result = generate_prediction(
            race_id=race_id,
            session_type=session_type,
            sub_session=sub_session,
            weather=weather,
            grid_positions=grid_positions,
            feature_weights=feature_weights,
            simulation_count=simulation_count,
            ai_config={
                'ai_mode': ai_mode,
                'ai_model': ai_model,
                'ai_api_key': ai_api_key,
                'ai_weight': ai_weight,
                'ai_temperature': ai_temperature,
            }
        )
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Prediction error for race {race_id}: {e}")
        if settings.DEBUG:
            import traceback
            logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@predictions_bp.route('/api/ai-chat', methods=['POST'])
def api_ai_chat():
    """AI chat endpoint – project-aware, works with FREE models (no API key)."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    message = data.get('message', '')
    model = data.get('model', 'pollinations-openai')
    api_key = data.get('api_key', '') or data.get('ai_api_key', '')
    temperature = float(data.get('temperature', data.get('ai_temperature', 0.7)))
    # Project context for vetting
    race_id = data.get('race_id')
    predictions = data.get('predictions')  # {driver: prob}
    grid_positions = data.get('grid_positions')

    if not message:
        return jsonify({'error': 'message is required'}), 400

    try:
        from engine.ai_client import ai_client
        from ai.project_context import build_project_context

        # Build project-aware enriched prompt when race context present
        context = {"race_id": race_id, "predictions": predictions, "grid_positions": grid_positions} if race_id or predictions else None

        # ai_client handles FREE vs paid + project enrichment internally
        res = ai_client.call_ai(model=model, api_key=api_key or "", prompt=message, temperature=temperature, max_tokens=1500, context=context)
        if res and res.get('text'):
            return jsonify({'response': res['text'], 'provider': res.get('provider', 'ai'), 'model': model}), 200
        # Deterministic fallback – local rules always answer
        from ai.free_providers import LocalRuleBasedClient
        fallback = LocalRuleBasedClient().chat(message, context=context)
        return jsonify({'response': fallback['text'], 'provider': 'local-rules', 'model': model}), 200
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        if settings.DEBUG:
            import traceback
            logger.error(traceback.format_exc())
        # Never fail hard – return local answer
        try:
            from ai.free_providers import LocalRuleBasedClient
            fallback = LocalRuleBasedClient().chat(message, context={"race_id": race_id, "predictions": predictions})
            return jsonify({'response': fallback['text'], 'provider': 'local-rules', 'model': model}), 200
        except Exception:
            pass
        error_response = f"I encountered an error processing your request: {str(e)}. The preview still works – try a 🟢 Free model with no key, or check your API key for paid models."
        return jsonify({'response': error_response, 'provider': 'error', 'model': model}), 200  # Return 200 with error message instead of 500


@predictions_bp.route('/api/ai-vet', methods=['POST'])
def api_ai_vet():
    """Vet a just-run prediction – project-aware, free."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    race_id = data.get('race_id')
    session_type = data.get('session_type', 'race')
    weather = data.get('weather', 'dry')
    model = data.get('model', 'pollinations-openai')
    api_key = data.get('api_key', '') or data.get('ai_api_key', '')
    temperature = float(data.get('temperature', 0.6))
    predictions = data.get('predictions') or data.get('winner_probabilities')
    grid_positions = data.get('grid_positions')

    if not race_id or not predictions:
        return jsonify({'error': 'race_id and predictions are required'}), 400

    # Normalise predictions: accept {CODE: prob} or {"predictions": [...]}
    if isinstance(predictions, dict) and "podium" in predictions:
        # full predictions object
        try:
            podium = predictions.get("podium", {}).get("predictions", [])
            predictions = {p["driver_code"]: p["probability"] for p in podium} if podium else predictions.get("winner", {})
        except Exception:
            pass
    if isinstance(predictions, list):
        predictions = {p.get("driver_code", p.get("code")): p.get("probability", p.get("prob", 0)) for p in predictions}

    try:
        from engine.ai_client import ai_client
        res = ai_client.vet_predictions(model=model, api_key=api_key or "", race_id=race_id, session_type=session_type, predictions=predictions, grid_positions=grid_positions, weather=weather, temperature=temperature)
        if res and res.get('text'):
            return jsonify({'response': res['text'], 'provider': res.get('provider'), 'model': model, 'vetted': True}), 200
        return jsonify({'response': 'No vetting available.', 'provider': 'none', 'model': model}), 200
    except Exception as e:
        logger.error(f"AI vet error: {e}")
        return jsonify({'response': f"Vetting failed: {str(e)}", 'provider': 'error', 'model': model}), 200


@predictions_bp.route('/api/ai-models', methods=['GET'])
def api_ai_models():
    """List available models – free and paid – so UI can stay in sync."""
    return jsonify({
        "free": [
            {"id": "pollinations-openai", "label": "Pollinations GPT-4o-Mini (Free, no key)", "needs_key": False, "via": "pollinations + puter"},
            {"id": "puter-gpt-4o-mini", "label": "Puter GPT-4o Mini (Free)", "needs_key": False, "via": "puter.js"},
            {"id": "puter-gpt-5-nano", "label": "Puter GPT-5 Nano (Free)", "needs_key": False, "via": "puter.js"},
            {"id": "puter-claude-sonnet", "label": "Puter Claude Sonnet (Free)", "needs_key": False, "via": "puter.js"},
            {"id": "puter-gemini-flash", "label": "Puter Gemini 2.0 Flash (Free)", "needs_key": False, "via": "puter.js"},
            {"id": "puter-gemini-pro", "label": "Puter Gemini 2.5 Pro (Free)", "needs_key": False, "via": "puter.js"},
            {"id": "puter-llama-3.3", "label": "Puter Llama 3.3 70B (Free)", "needs_key": False, "via": "puter.js"},
            {"id": "puter-mistral", "label": "Puter Mistral Small (Free)", "needs_key": False, "via": "puter.js"},
            {"id": "puter-deepseek", "label": "Puter DeepSeek R1 (Free)", "needs_key": False, "via": "puter.js"},
            {"id": "puter-qwen", "label": "Puter Qwen 2.5 (Free)", "needs_key": False, "via": "puter.js"},
            {"id": "free-local", "label": "Local Project-Aware (Offline, always works)", "needs_key": False, "via": "local-rules"},
        ],
        "paid": [
            {"id": "gemini-2.0-flash-exp", "label": "Gemini 2.0 Flash", "needs_key": True},
            {"id": "gpt-4o", "label": "GPT-4o", "needs_key": True},
            {"id": "gpt-4o-mini", "label": "GPT-4o Mini", "needs_key": True},
            {"id": "claude-3.5-sonnet", "label": "Claude 3.5 Sonnet", "needs_key": True},
            {"id": "llama-3.3-70b", "label": "Llama 3.3 70B (Groq)", "needs_key": True},
            {"id": "mistral-large", "label": "Mistral Large", "needs_key": True},
        ],
        "note": "Free models use Puter.js (browser) + Pollinations + local fallback – no API key needed. Paid models go direct to provider."
    })


def validate_prediction_request(data: dict) -> list:
    """Validate prediction request data."""
    errors = []
    if not isinstance(data, dict):
        errors.append("Request data must be a JSON object")
        return errors

    race_id = data.get('race_id')
    if not race_id or not isinstance(race_id, str):
        errors.append("race_id is required and must be a string")

    session_type = data.get('session_type')
    if not session_type or not isinstance(session_type, str):
        errors.append("session_type is required and must be a string")

    return errors


def handle_prediction_error(e: Exception, race_id: str) -> tuple:
    """Handle prediction errors and return appropriate response."""
    error_msg = str(e)
    logger.error(f"Error generating prediction for race {race_id}: {error_msg}")
    return jsonify({
        'error': 'Prediction generation failed',
        'message': error_msg,
        'race_id': race_id
    }), 500


@predictions_bp.route('/predict', methods=['POST'])
def predict():
    """Generate predictions for a race session (legacy endpoint)."""
    try:
        data = request.get_json() or {}
        race_id = data.get('race_id')
        session_type = data.get('session_type', 'race')
        weather = data.get('weather', 'dry')
        grid_positions = data.get('grid_positions')

        if not race_id:
            return jsonify({'error': 'race_id is required'}), 400

        result = generate_prediction(
            race_id=race_id,
            session_type=session_type,
            weather=weather,
            grid_positions=grid_positions
        )
        return jsonify(result), 200
    except Exception as e:
        return handle_prediction_error(e, data.get('race_id', 'unknown'))
