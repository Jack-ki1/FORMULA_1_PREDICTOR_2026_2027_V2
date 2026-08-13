"""
Application settings and configuration.
Central point for all environment-based configuration.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application settings loaded from environment variables."""
    
    # Season Configuration
    SEASON_YEAR = int(os.getenv('SEASON_YEAR', '2026'))
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    FLASK_PORT = int(os.getenv('FLASK_PORT', '5000'))
    
    # Cache Configuration
    API_CACHE_TTL = int(os.getenv('API_CACHE_TTL', '300'))  # 5 minutes default
    FASTF1_CACHE_ENABLED = os.getenv('FASTF1_CACHE_ENABLED', 'True').lower() == 'true'
    FASTF1_CACHE_PATH = os.getenv('FASTF1_CACHE_PATH', 'cache/fastf1_cache')
    MODEL_CACHE_PATH = os.getenv('MODEL_CACHE_PATH', 'cache/model_cache')
    
    # Database Configuration
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///f1_predictor.db')
    
    # Background Scheduler
    LIVE_UPDATE_INTERVAL = int(os.getenv('LIVE_UPDATE_INTERVAL', '300'))  # 5 minutes
    POST_RACE_EVALUATION_ENABLED = os.getenv('POST_RACE_EVALUATION_ENABLED', 'True').lower() == 'true'
    
    # Model Configuration
    DEFAULT_MODEL_VERSION = os.getenv('DEFAULT_MODEL_VERSION', 'v1.0')
    ENABLE_ENSEMBLE = os.getenv('ENABLE_ENSEMBLE', 'True').lower() == 'true'
    MONTE_CARLO_SIMULATIONS = int(os.getenv('MONTE_CARLO_SIMULATIONS', '1000'))
    
    # Reports Configuration
    PDF_EXPORT_ENABLED = os.getenv('PDF_EXPORT_ENABLED', 'True').lower() == 'true'
    SHARE_CARD_ENABLED = os.getenv('SHARE_CARD_ENABLED', 'True').lower() == 'true'
    
    # Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    CACHE_DIR = os.path.join(BASE_DIR, 'cache')
    API_RESPONSES_CACHE = os.path.join(CACHE_DIR, 'api_responses')
    
    @classmethod
    def init_directories(cls):
        """Create necessary directories if they don't exist."""
        directories = [
            cls.CACHE_DIR,
            cls.API_RESPONSES_CACHE,
            cls.FASTF1_CACHE_PATH,
            cls.MODEL_CACHE_PATH,
        ]
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
    
    @classmethod
    def get_flask_config(cls):
        """Return Flask configuration dictionary."""
        return {
            'SECRET_KEY': cls.SECRET_KEY,
            'DEBUG': cls.DEBUG,
            'SQLALCHEMY_DATABASE_URI': cls.DATABASE_URL,
            'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        }

# Global settings instance
settings = Settings()

# Initialize directories on import
Settings.init_directories()
