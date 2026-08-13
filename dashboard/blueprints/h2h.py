"""
H2H blueprint - driver vs driver comparison with live and per-race views.
"""
from flask import Blueprint, render_template, jsonify, request
from engine.elo_calculator import elo_calculator
from config.team_driver_lineup_2026 import get_all_drivers

h2h_bp = Blueprint('h2h', __name__)

@h2h_bp.route('/')
def h2h():
    """Render H2H comparison page."""
    drivers = get_all_drivers()
    return render_template('h2h.html', drivers=drivers)

@h2h_bp.route('/api/compare', methods=['POST'])
def api_compare():
    """Compare two drivers."""
    data = request.json
    driver_a = data.get('driver_a')
    driver_b = data.get('driver_b')
    
    try:
        # Get H2H probability
        probability = elo_calculator.get_h2h_probability(driver_a, driver_b)
        
        # Get driver info
        driver_a_info = get_all_drivers()
        driver_b_info = get_all_drivers()
        
        return jsonify({
            'driver_a': driver_a,
            'driver_b': driver_b,
            'win_probability': probability,
            'reverse_probability': 1 - probability,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@h2h_bp.route('/api/drivers')
def api_drivers():
    """Get all drivers for comparison."""
    drivers = get_all_drivers()
    return jsonify(drivers)
