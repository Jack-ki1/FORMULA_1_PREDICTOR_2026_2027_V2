"""
Application settings and configuration.
Central point for all environment-based configuration.
"""
import os
import logging
from typing import Dict, List, Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Season Configuration
    SEASON_YEAR: int = 2026
    DEBUG: bool = False
    
    # Application Configuration
    VERSION: str = '1.0.0'
    ENVIRONMENT: str = 'development'
    HOST: str = '0.0.0.0'
    PORT: int = 5000
    
    # Flask Configuration — HF Spaces Docker SDK expects 7860 via app_port; respect PORT env
    SECRET_KEY: str = 'dev-secret-key-change-in-production'
    FLASK_ENV: str = 'development'
    FLASK_HOST: str = '0.0.0.0'
    FLASK_PORT: int = 5000  # overridden at runtime if PORT / SPACE_ID detected (see __init__)
    
    # Cache Configuration
    API_CACHE_TTL: int = 300  # 5 minutes default
    CACHE_TTL_SHORT: int = 60  # 1 minute
    CACHE_TTL_LONG: int = 3600  # 1 hour
    API_RESPONSES_CACHE: str = 'cache/api_responses'
    FASTF1_CACHE_ENABLED: bool = True
    FASTF1_CACHE_PATH: str = 'cache/fastf1_cache'
    MODEL_CACHE_PATH: str = 'cache/model_cache'
    
    # Database configuration
    DATABASE_URL: str = 'sqlite:///./f1_predictions.db'
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: float = 30.0
    DATABASE_POOL_RECYCLE: int = 1800

    # Data retention policies
    PREDICTION_RETENTION_DAYS: int = 90
    SESSION_DATA_RETENTION_HOURS: int = 24
    ERROR_LOG_RETENTION_DAYS: int = 30

    # Database health check
    DATABASE_HEALTH_CHECK_INTERVAL: int = 300  # 5 minutes

    # Background Scheduler
    LIVE_UPDATE_INTERVAL: int = 300  # 5 minutes
    POST_RACE_EVALUATION_ENABLED: bool = True
    
    # Model Configuration
    DEFAULT_MODEL_VERSION: str = 'v1.0'
    ENABLE_ENSEMBLE: bool = True
    MONTE_CARLO_SIMULATIONS: int = 3000
    SIMULATION_MIN_COUNT: int = 100
    SIMULATION_MAX_COUNT: int = 10000

    # AI provider configuration
    AI_PROVIDER: str = 'free'  # free (pollinations/puter/local) by default – works without keys
    HUGGINGFACE_API_KEY: str = ''
    OPENAI_API_KEY: str = ''
    HUGGINGFACE_MODEL_ID: str = 'microsoft/phi-2'
    OPENAI_MODEL: str = 'gpt-3.5-turbo-instruct'
    OLLAMA_BASE_URL: str = ''  # e.g. http://localhost:11434/v1
    OLLAMA_MODEL: str = 'llama3.1'
    OLLAMA_API_KEY: str = 'ollama'
    # Free providers
    POLLINATIONS_ENABLED: bool = True
    PUTER_ENABLED: bool = True
    FREE_AI_MODEL: str = 'pollinations-openai'  # default free model

    # AI model configuration
    AI_MODEL_TEMPERATURE: float = 0.7
    AI_MODEL_MAX_TOKENS: int = 1200
    AI_MODEL_TOP_P: float = 0.9

    # Security configuration
    JWT_ALGORITHM: str = 'HS256'
    JWT_EXPIRATION_HOURS: int = 24

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT: str = '100/hour'
    RATE_LIMIT_AUTHED: str = '500/hour'

    # Security headers — CSP must allow Tailwind/Chart.js CDNs + Google Fonts + inline theme script
    # frame-ancestors is 'none' locally; on HF Spaces we relax to allow the hf.co iframe (patched in __init__)
    SECURITY_HEADERS: Dict[str, str] = {
        'Content-Security-Policy': (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://js.puter.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; "
            "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; "
            "img-src 'self' data: https:; "
            "media-src 'self' data: blob:; "
            "connect-src 'self' https://api.jolpi.ca https://api.openf1.org https://huggingface.co https://*.huggingface.co https://text.pollinations.ai https://gen.pollinations.ai https://api.puter.com https://*.puter.com; "
            "frame-ancestors 'none'"
        ),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }

    # Input validation settings
    INPUT_VALIDATION_ENABLED: bool = True
    MAX_INPUT_LENGTH: int = 1000

    # Monitoring and observability configuration
    MONITORING_ENABLED: bool = True
    METRICS_PORT: int = 9090
    METRICS_UPDATE_INTERVAL: int = 15

    # Log aggregation configuration
    LOG_AGGREGATION_ENABLED: bool = True
    LOG_RETENTION_DAYS: int = 30

    # Alerting configuration
    ALERTING_ENABLED: bool = True
    ALERTING_EMAIL_RECIPIENTS: List[str] = []
    ALERTING_SLACK_WEBHOOK: str = ''

    # Custom metrics configuration
    PREDICTION_LATENCY_BUCKETS: List[float] = [0.1, 0.5, 1.0, 2.0, 5.0]
    DATABASE_QUERY_LATENCY_BUCKETS: List[float] = [0.01, 0.05, 0.1, 0.5]

    # Performance optimization configuration
    CACHE_ENABLED: bool = True
    CACHE_TTL_SECONDS: int = 300
    CACHE_MAX_SIZE: int = 1000
    
    # Redis configuration
    REDIS_HOST: str = 'localhost'
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None

    # Database optimization
    DATABASE_QUERY_OPTIMIZATION_ENABLED: bool = True
    DATABASE_INDEXES_ENABLED: bool = True

    # ML model optimization
    MODEL_INFERENCE_OPTIMIZATION_ENABLED: bool = True
    MODEL_COMPILATION_ENABLED: bool = False

    # API response optimization
    API_RESPONSE_COMPRESSION_ENABLED: bool = True
    API_RESPONSE_CACHE_HEADERS: str = 'public, max-age=300'

    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='allow'
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # HF Spaces: if a persistent /data volume is mounted, prefer it for DB & caches
        # Detect HF Space via SPACE_ID or explicit HF_PERSISTENT_DIR / HF volume
        hf_data = "/data"
        is_hf = bool(os.getenv("SPACE_ID") or os.getenv("HF_SPACE_ID") or os.path.isdir(hf_data))
        # Port: HF Docker Spaces must listen on $PORT (default 7860). Override FLASK_PORT accordingly
        env_port = os.getenv("PORT") or os.getenv("APP_PORT")
        if env_port and env_port.isdigit():
            self.FLASK_PORT = int(env_port)
        elif is_hf and self.FLASK_PORT == 5000:
            # default HF port when running on Spaces without explicit PORT env
            self.FLASK_PORT = 7860

        # Persist DB / caches to /data if available and DATABASE_URL is default sqlite
        default_sqlite = "sqlite:///./f1_predictions.db"
        if is_hf and os.path.isdir(hf_data) and self.DATABASE_URL == default_sqlite:
            try:
                os.makedirs(hf_data, exist_ok=True)
                self.DATABASE_URL = f"sqlite:////{hf_data.lstrip('/')}/f1_predictions.db"
                # Redirect caches to /data as well (survives restarts)
                self.API_RESPONSES_CACHE = f"{hf_data}/api_responses"
                self.FASTF1_CACHE_PATH = f"{hf_data}/fastf1_cache"
                self.MODEL_CACHE_PATH = f"{hf_data}/model_cache"
            except Exception:
                pass
        # Also honor explicit override via HF env vars
        if os.getenv("DATABASE_URL"):
            self.DATABASE_URL = os.getenv("DATABASE_URL")

        # HF Spaces is served inside an iframe on https://huggingface.co — relax frame-ancestors there
        if is_hf:
            csp = self.SECURITY_HEADERS.get("Content-Security-Policy", "")
            csp = csp.replace("frame-ancestors 'none'", "frame-ancestors 'self' https://huggingface.co https://*.huggingface.co")
            self.SECURITY_HEADERS["Content-Security-Policy"] = csp
            # X-Frame-Options must not be DENY inside HF iframe
            self.SECURITY_HEADERS["X-Frame-Options"] = "SAMEORIGIN"

        # Database configuration validation
        if self.DATABASE_URL.startswith('sqlite') and not self.DATABASE_URL.startswith('sqlite:///'):
            raise ValueError("SQLite DATABASE_URL must start with 'sqlite:///'")

        # Initialize directories
        self._init_directories()

    def _init_directories(self):
        """Initialize required directories."""
        import os
        directories = [
            self.FASTF1_CACHE_PATH,
            self.MODEL_CACHE_PATH,
            'cache/api_responses',
            'cache/fastf1_cache',
            'cache/model_cache'
        ]
        for directory in directories:
            os.makedirs(directory, exist_ok=True)

# Create settings instance
settings = Settings()