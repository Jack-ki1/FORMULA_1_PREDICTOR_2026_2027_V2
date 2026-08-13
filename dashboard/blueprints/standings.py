"""
Standings blueprint - live driver and constructor championship standings.
"""
from flask import Blueprint, render_template, jsonify
from data.season_2026 import get_driver_standings, get_constructor_standings
from data.jolpica_client import JolpicaClient

standings_bp = Blueprint('standings', __name__)

@standings_bp.route('/')
def standings():
    """Render standings page."""
    return render_template('standings.html')

@standings_bp.route('/api/driver-standings')
def api_driver_standings():
    """Get driver championship standings."""
    try:
        client = JolpicaClient()
        result = client.get_driver_standings()
        
        if result['source'] == 'live':
            return jsonify(result)
        else:
            # Fallback to local data
            standings = get_driver_standings()
            return jsonify({
                'data': standings,
                'source': 'local',
            })
    except Exception as e:
        # Fallback to local data
        standings = get_driver_standings()
        return jsonify({
            'data': standings,
            'source': 'local',
            'error': str(e),
        })

@standings_bp.route('/api/constructor-standings')
def api_constructor_standings():
    """Get constructor championship standings."""
    try:
        client = JolpicaClient()
        result = client.get_constructor_standings()
        
        if result['source'] == 'live':
            return jsonify(result)
        else:
            # Fallback to local data
            standings = get_constructor_standings()
            return jsonify({
                'data': standings,
                'source': 'local',
            })
    except Exception as e:
        # Fallback to local data
        standings = get_constructor_standings()
        return jsonify({
            'data': standings,
            'source': 'local',
            'error': str(e),
        })
