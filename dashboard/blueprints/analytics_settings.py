"""
Analytics & Settings blueprint - accuracy metrics and parameter tuning.
"""
from flask import Blueprint, render_template, jsonify, request
from engine.benchmark_suite import benchmark_suite
from config.feature_weights import feature_weights
from config.constants import TARGETS

analytics_settings_bp = Blueprint('analytics_settings', __name__)

@analytics_settings_bp.route('/')
def analytics_settings():
    """Render analytics and settings page."""
    return render_template('analytics_settings.html')

@analytics_settings_bp.route('/api/accuracy')
def api_accuracy():
    """Get model accuracy metrics."""
    report = benchmark_suite.generate_accuracy_report()
    return jsonify(report)

@analytics_settings_bp.route('/api/feature-weights')
def api_feature_weights():
    """Get current feature weights."""
    weights = feature_weights.get_all_weights()
    return jsonify(weights)

@analytics_settings_bp.route('/api/feature-weights', methods=['POST'])
def api_update_feature_weights():
    """Update feature weights."""
    data = request.json
    
    try:
        for weight_name, value in data.items():
            feature_weights.validate_weight(weight_name, value)
        
        # In a real application, you would save these to a database
        return jsonify({'status': 'success', 'weights': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@analytics_settings_bp.route('/api/targets')
def api_targets():
    """Get available prediction targets."""
    targets = list(TARGETS.values())
    return jsonify(targets)
