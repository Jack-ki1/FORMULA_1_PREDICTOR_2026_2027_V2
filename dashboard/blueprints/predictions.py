import logging
import json
from flask import Blueprint, request, jsonify, render_template
from engine.predictor import generate_prediction
from config.settings import settings
from data.calendar_2026 import CALENDAR_2026, get_race_by_id
from data.circuit_data import CIRCUITS
from security.auth import require_auth, require_role, validate_input
from security.middleware import add_security_headers, rate_limit, validate_and_sanitize_inputs

logger = logging.getLogger(__name__)

predictions_bp = Blueprint('predictions', __name__)


@predictions_bp.route('/')
def index():
    """Render the main dashboard page."""
    return render_template('dashboard.html', calendar=CALENDAR_2026)


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
    weather = data.get('weather', 'dry')
    target_id = data.get('target_id', 'winner')

    if not race_id:
        return jsonify({'error': 'race_id is required'}), 400

    try:
        result = generate_prediction(race_id, session_type)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Prediction error for race {race_id}: {e}")
        if settings.DEBUG:
            import traceback
            logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@predictions_bp.route('/api/ai-chat', methods=['POST'])
def api_ai_chat():
    """AI chat endpoint for the dashboard AI sidebar."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    message = data.get('message', '')
    model = data.get('model', 'gemini-2.5-pro')
    api_key = data.get('api_key', '')

    if not message:
        return jsonify({'error': 'message is required'}), 400

    try:
        from ai.provider import AIProviderManager
        manager = AIProviderManager()
        result = manager.predict(prompt=message, model=model, api_key=api_key)
        return jsonify({'response': result.get('text', str(result))}), 200
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        return jsonify({'error': str(e), 'response': f'AI unavailable: {str(e)}'}), 500


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

    if settings.DEBUG:
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")

    return jsonify({
        'error': 'Prediction generation failed',
        'message': error_msg,
        'race_id': race_id
    }), 500


@predictions_bp.route('/predict', methods=['POST'])
@add_security_headers
@rate_limit('100/hour')
@validate_and_sanitize_inputs(['race_id', 'session_type'])
@require_auth
def predict():
    """Generate predictions for a race session (legacy endpoint)."""
    try:
        data = request.get_json()
        if not data:
            logger.warning("Received empty request body")
            return jsonify({'error': 'Request body must be JSON'}), 400

        errors = validate_prediction_request(data)
        if errors:
            logger.warning(f"Validation errors: {errors}")
            return jsonify({'errors': errors}), 400

        race_id = data['race_id']
        session_type = data['session_type']

        logger.info(f"Processing prediction request for race {race_id}, session {session_type}")

        result = generate_prediction(race_id, session_type)

        logger.info(f"Successfully generated prediction for race {race_id}")
        return jsonify(result), 200

    except Exception as e:
        return handle_prediction_error(e, data.get('race_id', 'unknown'))
