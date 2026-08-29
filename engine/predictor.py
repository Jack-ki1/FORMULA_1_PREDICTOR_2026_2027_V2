"""
Main predictor orchestrator - coordinates features, models, and probability shaping.
This is the main entry point for generating predictions.
"""
import numpy as np
import pandas as pd
import logging
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, cast, Union
from config.settings import settings
from data.session_context import build_session_context
from data.validation import validate_prediction_data
from data.fallback import FallbackStrategy
from models.prediction import Prediction
from database.client import DatabaseClient
from engine.grid_model import calculate_grid_positions
from engine.probability_model import (
    calculate_winner_probabilities,
    enforce_probability_sum,
    calibrate_probabilities,
    calculate_confidence_intervals,
    detect_model_drift,
    save_prediction_metadata
)
from cache.redis import get_cache

logger = logging.getLogger(__name__)

def generate_prediction(race_id: str, session_type: str) -> Dict[str, Any]:
    """
    Generate comprehensive prediction for a race session.
    
    Returns:
        Dictionary containing grid positions, winner probabilities, and metadata
    """
    # Create cache key
    cache_key = f"prediction:{race_id}:{session_type}"
    
    # Try to get from cache first
    if settings.CACHE_ENABLED:
        cache = get_cache()
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.info(f"Retrieved prediction for race {race_id} from cache")
            return json.loads(cached_result)
    
    try:
        logger.info(f"Starting prediction generation for race {race_id}, session {session_type}")
        
        # Calculate grid positions
        grid_positions = calculate_grid_positions(race_id, session_type)
        
        # Calculate winner probabilities
        winner_probabilities = calculate_winner_probabilities(race_id, session_type)
        
        # Apply probability calibration
        from engine.probability_model import calibrate_probabilities
        calibrated_probabilities = calibrate_probabilities(winner_probabilities)
        
        # Calculate confidence intervals
        from engine.probability_model import calculate_confidence_intervals
        confidence_intervals = calculate_confidence_intervals(calibrated_probabilities)
        
        # Detect model drift
        from engine.probability_model import detect_model_drift
        model_drift_score = detect_model_drift(calibrated_probabilities)
        
        # Save predictions to database
        save_predictions_to_database(race_id, session_type, grid_positions, calibrated_probabilities, confidence_intervals)
        
        # Save prediction metadata
        from engine.probability_model import save_prediction_metadata
        save_prediction_metadata(race_id, session_type, calibrated_probabilities, confidence_intervals, model_drift_score)
        
        # Prepare response
        result = {
            'race_id': race_id,
            'session_type': session_type,
            'grid_positions': grid_positions,
            'winner_probabilities': calibrated_probabilities,
            'confidence_intervals': confidence_intervals,
            'model_drift_score': model_drift_score,
            'timestamp': str(datetime.utcnow()),
            'status': 'success'
        }
        
        # Cache the result
        if settings.CACHE_ENABLED:
            cache.set(cache_key, result, ttl=settings.CACHE_TTL_SECONDS)
        
        logger.info(f"Successfully generated prediction for race {race_id}")
        return result
        
    except Exception as e:
        logger.error(f"Error generating prediction for race {race_id}: {e}")
        raise


def save_predictions_to_database(
    race_id: str, 
    session_type: str, 
    grid_positions: Dict[str, int], 
    winner_probabilities: Dict[str, float], 
    confidence_intervals: Dict[str, Dict[str, float]]
) -> bool:
    """Save predictions to database."""
    try:
        db_client = DatabaseClient()
        with db_client.get_session() as db:
            # Save each driver's prediction
            for driver_code, position in grid_positions.items():
                probability = winner_probabilities.get(driver_code, 0.0)
                confidence = confidence_intervals.get(driver_code, {})
                
                # Create prediction record
                prediction = Prediction(
                    race_id=race_id,
                    session_type=session_type,
                    prediction_type='winner',
                    driver_code=driver_code,
                    probability=probability,
                    confidence_interval=confidence,
                    created_at=datetime.utcnow()
                )
                
                db.add(prediction)
            
            db.commit()
            logger.info(f"Saved {len(grid_positions)} predictions to database")
            return True
            
    except Exception as e:
        logger.error(f"Error saving predictions to database: {e}")
        return False