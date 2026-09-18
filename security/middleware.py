import logging
from functools import wraps
from flask import request, g, jsonify
from config.settings import settings
from security.auth import validate_input

logger = logging.getLogger(__name__)

def add_security_headers(f):
    """Add security headers to response."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        response = f(*args, **kwargs)
        
        # Add security headers
        if hasattr(response, 'headers'):
            for header, value in settings.SECURITY_HEADERS.items():
                response.headers[header] = value
        
        return response
    return decorated_function

_rate_limit_store: dict = {}

def rate_limit(limit: str = None):
    """Process-wide in-memory rate limiting (falls back gracefully; use Redis in prod)."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not settings.RATE_LIMIT_ENABLED:
                return f(*args, **kwargs)
            from datetime import datetime, timedelta
            client_ip = request.remote_addr or "unknown"
            limit_key = f"rate_limit:{client_ip}:{f.__name__}"
            now = datetime.now()
            rec = _rate_limit_store.get(limit_key)
            if rec:
                last, count = rec["time"], rec["count"]
                if now - last > timedelta(hours=1):
                    count = 0
                max_requests = int((limit or settings.RATE_LIMIT_DEFAULT).split("/")[0])
                if count >= max_requests:
                    logger.warning(f"Rate limit exceeded for {client_ip} on {f.__name__}")
                    return jsonify({"error": "Rate limit exceeded"}), 429
                _rate_limit_store[limit_key] = {"time": now, "count": count + 1}
            else:
                _rate_limit_store[limit_key] = {"time": now, "count": 1}
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_and_sanitize_inputs(required_fields: list = None):
    """Validate and sanitize input data for endpoints."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get JSON data
            data = request.get_json()
            
            # Validate input
            if settings.INPUT_VALIDATION_ENABLED:
                errors = validate_input(data, required_fields, settings.MAX_INPUT_LENGTH)
                if errors:
                    logger.warning(f"Input validation errors: {errors}")
                    return jsonify({'errors': errors}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator