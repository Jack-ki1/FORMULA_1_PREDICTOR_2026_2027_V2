import logging
from flask import Flask
from config.settings import settings

logger = logging.getLogger(__name__)

# Initialize Flask application
app = Flask(__name__)

# Configure application
app.config['SECRET_KEY'] = settings.SECRET_KEY
app.config['JWT_ALGORITHM'] = settings.JWT_ALGORITHM
app.config['JWT_EXPIRATION_HOURS'] = settings.JWT_EXPIRATION_HOURS

# Import and register blueprints
from dashboard.blueprints.landing import landing_bp
from dashboard.blueprints.dashboard import dashboard_bp
from dashboard.blueprints.predictions import predictions_bp
from dashboard.blueprints.standings import standings_bp
from dashboard.blueprints.h2h import h2h_bp
from dashboard.blueprints.constructors import constructors_bp
from dashboard.blueprints.analytics_settings import analytics_settings_bp
from dashboard.blueprints.reports import reports_bp
from dashboard.blueprints.health import health_bp

app.register_blueprint(landing_bp)
app.register_blueprint(dashboard_bp, url_prefix='/dashboard')
app.register_blueprint(predictions_bp, url_prefix='/api')
app.register_blueprint(standings_bp, url_prefix='/standings')
app.register_blueprint(h2h_bp, url_prefix='/h2h')
app.register_blueprint(constructors_bp, url_prefix='/constructors')
app.register_blueprint(analytics_settings_bp, url_prefix='/analytics')
app.register_blueprint(reports_bp, url_prefix='/reports')
app.register_blueprint(health_bp, url_prefix='/health')

# Add error handlers
@app.errorhandler(404)
def not_found(error):
    return {'error': 'Not found'}, 404

@app.errorhandler(500)
def internal_error(error):
    return {'error': 'Internal server error'}, 500

# Health check endpoint
@app.route('/ping')
def ping():
    return {'status': 'healthy', 'version': settings.VERSION}, 200

if __name__ == '__main__':
    # Run application
    app.run(
        host=settings.FLASK_HOST,
        port=settings.FLASK_PORT,
        debug=settings.DEBUG
    )