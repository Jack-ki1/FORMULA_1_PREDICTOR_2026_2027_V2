"""
Flask application factory - main application entry point.
Registers all blueprints and configures the Flask app.
"""
from flask import Flask, render_template, jsonify
from flask_cors import CORS
from config.settings import settings, Settings

def create_app():
    """Create and configure Flask application."""
    app = Flask(__name__)
    app.config.from_object(settings.get_flask_config())
    
    # Enable CORS
    CORS(app)
    
    # Register blueprints
    from dashboard.blueprints.landing import landing_bp
    from dashboard.blueprints.predictions import predictions_bp
    from dashboard.blueprints.standings import standings_bp
    from dashboard.blueprints.h2h import h2h_bp
    from dashboard.blueprints.constructors import constructors_bp
    from dashboard.blueprints.analytics_settings import analytics_settings_bp
    from dashboard.blueprints.reports import reports_bp
    
    app.register_blueprint(landing_bp)
    app.register_blueprint(predictions_bp, url_prefix='/dashboard')
    app.register_blueprint(standings_bp, url_prefix='/standings')
    app.register_blueprint(h2h_bp, url_prefix='/h2h')
    app.register_blueprint(constructors_bp, url_prefix='/constructors')
    app.register_blueprint(analytics_settings_bp, url_prefix='/analytics')
    app.register_blueprint(reports_bp, url_prefix='/reports')
    
    # Root route redirects to landing
    @app.route('/')
    def index():
        return render_template('landing.html')
    
    # Health check endpoint
    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy', 'version': '1.0.0'})
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app
