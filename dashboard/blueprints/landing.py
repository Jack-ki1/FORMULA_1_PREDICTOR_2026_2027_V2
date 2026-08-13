"""
Landing page blueprint - homepage with F1 Predict-style interface.
"""
from flask import Blueprint, render_template, jsonify
from data.calendar_2026 import get_next_race, get_upcoming_races
from engine.predictor import predictor

landing_bp = Blueprint('landing', __name__)

@landing_bp.route('/')
def landing():
    """Render landing page - uses the custom F1 homepage."""
    return render_template('homepage.html')

@landing_bp.route('/api/next-race')
def api_next_race():
    """Get next race information."""
    next_race = get_next_race()
    return jsonify(next_race)

@landing_bp.route('/api/upcoming-races')
def api_upcoming_races():
    """Get upcoming races."""
    races = get_upcoming_races()
    return jsonify(races)
