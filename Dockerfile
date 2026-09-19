# Hugging Face Spaces Docker — https://huggingface.co/docs/hub/spaces-sdks-docker
FROM python:3.11-slim

# System deps: gcc/g++ for lightgbm/xgboost, curl for healthcheck, libpango for WeasyPrint
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ curl \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces runs as user 1000 — create it early so COPY --chown works and /data is writable
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HUB_ENABLE_HF_TRANSFER=1 \
    HF_HOME=/tmp/hf_cache \
    HF_HUB_CACHE=/tmp/hf_cache \
    TRANSFORMERS_CACHE=/tmp/hf_cache \
    HUGGINGFACE_HUB_CACHE=/tmp/hf_cache \
    MPLCONFIGDIR=/tmp/mpl_cache

WORKDIR /app

# Leverage layer cache: requirements first (smaller image, faster rebuilds)
COPY --chown=user requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf /root/.cache/pip

# Then copy the rest (respects .dockerignore — keeps image ~300MB vs 1GB)
COPY --chown=user . .

# Cache dirs — on HF ephemeral disk; if /data bucket mounted, app auto-migrates there (see config/settings.py)
RUN mkdir -p cache/api_responses cache/fastf1_cache cache/model_cache /tmp/hf_cache /tmp/mpl_cache && \
    chown -R user:user /app cache /tmp/hf_cache /tmp/mpl_cache && \
    chmod -R 775 cache

EXPOSE 7860

USER user

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:7860/health || exit 1

# Optimized for HF CPU Basic (2 vCPU, 16GB): 1 worker + 4 threads saves ~300MB RAM vs 2 workers
# --worker-tmp-dir /dev/shm avoids blocking on /tmp overlay (HF Spaces fix)
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "1", "--threads", "4", "--worker-class", "gthread", "--worker-tmp-dir", "/dev/shm", "--timeout", "120", "--graceful-timeout", "30", "--access-logfile", "-", "--error-logfile", "-", "wsgi:app"]
