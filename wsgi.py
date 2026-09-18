"""WSGI entrypoint for Gunicorn / Hugging Face Spaces.

Hugging Face Docker Spaces expects the container to listen on 0.0.0.0:7860.
This module exposes `app` as required by `gunicorn wsgi:app`.
"""
import os
import sys

# Ensure project root is on sys.path (important for HF container where WORKDIR=/app)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dashboard.app import create_app  # noqa: E402
from database.init import initialize_database  # noqa: E402
import logging

logger = logging.getLogger(__name__)

# Initialize DB once at import time — gunicorn preloads wsgi:app before forking workers
try:
    initialize_database()
    logger.info("Database initialized via wsgi import")
except Exception as e:
    logger.warning(f"DB init skipped at wsgi import: {e}")

app = create_app()

if __name__ == "__main__":
    # Fallback for `python wsgi.py` local dev
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", "7860")))
    app.run(host="0.0.0.0", port=port, debug=False)
