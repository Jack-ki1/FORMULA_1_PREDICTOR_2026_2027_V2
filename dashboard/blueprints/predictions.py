"""
Predictions blueprint - main dashboard with session-specific forecasts.
"""
from flask import Blueprint, render_template, jsonify, request
from engine.predictor import predictor
from data.calendar_2026 import get_active_calendar

predictions_bp = Blueprint('predictions', __name__)

@predictions_bp.route('/')
def dashboard():
    """Render main dashboard."""
    calendar = get_active_calendar()
    return render_template('dashboard.html', calendar=calendar)

@predictions_bp.route('/api/predict', methods=['POST'])
def api_predict():
    """Generate predictions for a race."""
    data = request.json
    
    race_id = data.get('race_id')
    target_id = data.get('target_id', 'podium')
    session_type = data.get('session_type', 'race')
    weather = data.get('weather', 'dry')
    feature_weights = data.get('feature_weights')
    
    try:
        result = predictor.predict(
            race_id=race_id,
            target_id=target_id,
            session_type=session_type,
            weather=weather,
            feature_weights=feature_weights,
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@predictions_bp.route('/api/predict-session', methods=['POST'])
def api_predict_session():
    """Generate predictions for all targets in a session."""
    data = request.json
    
    race_id = data.get('race_id')
    session_type = data.get('session_type', 'race')
    weather = data.get('weather', 'dry')
    feature_weights = data.get('feature_weights')
    
    try:
        result = predictor.predict_session(
            race_id=race_id,
            session_type=session_type,
            weather=weather,
            feature_weights=feature_weights,
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@predictions_bp.route('/api/races')
def api_races():
    """Get available races."""
    calendar = get_active_calendar()
    return jsonify(calendar)
