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
    HF_HUB_ENABLE_HF_TRANSFER=1 \
    TRANSFORMERS_CACHE=/tmp/hf_cache \
    HF_HOME=/tmp/hf_cache

WORKDIR /app

# Leverage layer cache: requirements first
COPY --chown=user requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Then copy the rest (respects .dockerignore)
COPY --chown=user . .

# Cache dirs — on HF they will be on ephemeral disk; if a /data bucket is mounted we also use that
RUN mkdir -p cache/api_responses cache/fastf1_cache cache/model_cache /tmp/hf_cache && \
    chown -R user:user /app cache /tmp/hf_cache

EXPOSE 7860

USER user

# Healthcheck for HF (gunicorn workers = 2 * cpu + 1 is overkill on 2 vCPU free tier → 2 workers)
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "2", "--threads", "2", "--timeout", "120", "--access-logfile", "-", "wsgi:app"]
