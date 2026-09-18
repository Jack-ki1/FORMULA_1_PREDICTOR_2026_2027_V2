import logging

from sqlalchemy import create_engine, text
from config.settings import settings
from migrations._001_initial_schema import upgrade, downgrade

logger = logging.getLogger(__name__)

def initialize_database():
    """Initialize the database with migrations + ORM tables."""
    try:
        # Run raw migrations for predictions tables
        upgrade()
        # Ensure ORM Base tables (teams, drivers, circuits, races, etc.) also exist
        try:
            from database.models import Base
            from models.prediction import Base as PredBase  # same Base, but ensure import
            from sqlalchemy import create_engine
            engine = create_engine(settings.DATABASE_URL)
            Base.metadata.create_all(bind=engine)
            logger.info("ORM tables ensured via Base.metadata.create_all")
        except Exception as orm_e:
            logger.warning(f"ORM table creation skipped: {orm_e}")
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise


def verify_database_connection():
    """Verify database connection is working."""
    try:
        from config.settings import settings
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM sqlite_master WHERE type='table'"))
            table_count = result.scalar()
            logger.info(f"Database connection verified. Found {table_count} tables.")
            return True
    except Exception as e:
        logger.error(f"Database connection verification failed: {e}")
        return False