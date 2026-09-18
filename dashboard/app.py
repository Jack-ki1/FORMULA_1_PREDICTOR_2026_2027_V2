"""
Flask application factory - main application entry point.
Registers all blueprints and configures the Flask app.
"""
from flask import Flask, jsonify
from flask_cors import CORS
from config.settings import settings


def create_app():
    """Create and configure Flask application."""
    import os
    # Absolute paths so static works regardless of cwd/import context
    _here = os.path.dirname(os.path.abspath(__file__))
    app = Flask(__name__,
                static_folder=os.path.join(_here, 'static'),
                template_folder=os.path.join(_here, 'templates'),
                static_url_path='/static')

    # Configure Flask app
    app.config['SECRET_KEY'] = settings.SECRET_KEY
    app.config['DEBUG'] = settings.DEBUG
    app.config['FLASK_ENV'] = settings.FLASK_ENV

    # Enable CORS
    CORS(app)

    # Global security headers
    @app.after_request
    def _sec_headers(resp):
        for k, v in settings.SECURITY_HEADERS.items():
            resp.headers.setdefault(k, v)
        return resp

    # Register blueprints
    from dashboard.blueprints.landing import landing_bp
    from dashboard.blueprints.predictions import predictions_bp
    from dashboard.blueprints.standings import standings_bp
    from dashboard.blueprints.h2h import h2h_bp
    from dashboard.blueprints.constructors import constructors_bp
    from dashboard.blueprints.analytics_settings import analytics_settings_bp
    from dashboard.blueprints.reports import reports_bp
    from dashboard.blueprints.auth import auth_bp
    from dashboard.blueprints.openapi import openapi_bp

    app.register_blueprint(landing_bp)
    app.register_blueprint(predictions_bp, url_prefix='/dashboard')
    app.register_blueprint(standings_bp, url_prefix='/standings')
    app.register_blueprint(h2h_bp, url_prefix='/h2h')
    app.register_blueprint(constructors_bp, url_prefix='/constructors')
    app.register_blueprint(analytics_settings_bp, url_prefix='/analytics')
    app.register_blueprint(reports_bp, url_prefix='/reports')
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(openapi_bp)

    # Prometheus metrics (only if monitoring enabled)
    if settings.MONITORING_ENABLED:
        try:
            from monitoring.blueprint import monitoring_bp
            app.register_blueprint(monitoring_bp, url_prefix='/monitoring')
            # Legacy alias /metrics for Prometheus scrapers
            @app.route('/metrics')
            def _metrics_alias():
                from monitoring.blueprint import metrics as _m
                return _m()
        except Exception:
            pass
    
    # Add a direct route to /dashboard (without trailing slash) that redirects to /dashboard/
    @app.route('/dashboard')
    def dashboard_redirect():
        from flask import redirect
        return redirect('/dashboard/')

    # Health check endpoint
    @app.route('/health')
    def health():
        try:
            from database.init import verify_database_connection
            db_ok = verify_database_connection()
        except Exception:
            db_ok = False
        return jsonify({'status': 'healthy' if db_ok else 'degraded',
                        'version': settings.VERSION,
                        'season': settings.SEASON_YEAR,
                        'database': 'ok' if db_ok else 'unavailable'})

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500

    return app
