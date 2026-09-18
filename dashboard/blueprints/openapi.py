"""OpenAPI / info endpoints — lightweight DX for HF Spaces consumers."""
from flask import Blueprint, jsonify
from config.settings import settings
from config.constants import TARGETS

openapi_bp = Blueprint("openapi", __name__)

@openapi_bp.route("/api/info")
def info():
    return jsonify({
        "title": "F1 Predictor 2026",
        "version": settings.VERSION,
        "season": settings.SEASON_YEAR,
        "environment": settings.ENVIRONMENT,
        "port": settings.FLASK_PORT,
        "data_sources": {
            "jolpica": "https://api.jolpi.ca/ergast/f1/",
            "openf1": "https://api.openf1.org",
            "fastf1": "https://docs.fastf1.dev",
            "huggingface": settings.HUGGINGFACE_DATASET if getattr(settings, "HUGGINGFACE_DATASET", None) else "tracinginsights/RaceData",
            "f1db": "https://github.com/f1db/f1db"
        },
        "targets": list(TARGETS.keys()),
        "endpoints": [
            "POST /dashboard/api/predict-session",
            "GET /dashboard/api/races",
            "GET /standings/api/driver-standings",
            "POST /h2h/api/compare",
            "POST /reports/api/export",
            "GET /health",
            "GET /metrics (Prometheus)",
        ],
        "hf_space": bool(__import__("os").getenv("SPACE_ID")),
        "persistent_storage": __import__("os").path.isdir("/data"),
    })

@openapi_bp.route("/api/openapi.json")
def openapi_json():
    # Minimal OpenAPI 3.0 stub — full spec can be generated via flask-smorest if needed
    return jsonify({
        "openapi": "3.0.0",
        "info": {"title": "F1 Predictor 2026", "version": settings.VERSION},
        "paths": {
            "/dashboard/api/predict-session": {
                "post": {
                    "summary": "Run prediction for a race/session",
                    "requestBody": {"required": True, "content": {"application/json": {"schema": {"type": "object", "properties": {
                        "race_id": {"type": "string"}, "session_type": {"type": "string"}, "weather": {"type": "string"},
                        "grid_positions": {"type": "object"}, "simulation_count": {"type": "integer"}
                    }}}}},
                    "responses": {"200": {"description": "Prediction result"}}
                }
            },
            "/health": {"get": {"summary": "Health check", "responses": {"200": {"description": "healthy"}}}},
        }
    })
